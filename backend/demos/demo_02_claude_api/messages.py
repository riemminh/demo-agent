"""Gọi Claude Messages API thật (non-streaming). Không import FastAPI.

Một lần Send = đúng MỘT HTTP request tới Anthropic (max_retries=0).
Messages API là stateless: history nào muốn Claude thấy thì phải nằm trong `messages`.
"""

import time
from typing import Any

import anthropic
from anthropic import AsyncAnthropic
from anthropic.types import Message

import config

Turn = dict[str, str]  # {"role": "user"|"assistant", "content": "..."}


def build_request(messages: list[Turn], system: str, max_tokens: int) -> dict[str, Any]:
    """Body gửi Claude. Không chứa API key (SDK đặt key ở header)."""
    body: dict[str, Any] = {
        "model": config.LLM_MODEL,
        "max_tokens": max_tokens,
        "messages": messages,
        # Tắt extended thinking: thinking token tính vào max_tokens, có thể ăn hết trần
        # và response chỉ còn block "thinking", không có block text nào.
        "thinking": {"type": "disabled"},
    }
    if system:
        body["system"] = system  # system là tham số top-level, KHÔNG phải một role.
    return body


def new_client() -> AsyncAnthropic:
    # max_retries=0: một lần Send chỉ gửi một request, không âm thầm retry làm tăng chi phí.
    return AsyncAnthropic(
        api_key=config.ANTHROPIC_API_KEY,
        timeout=config.LLM_TIMEOUT_SECONDS,
        max_retries=0,
    )


def answer_text(message: Message) -> str:
    """content là LIST block, không phải string: ghép các block type="text"."""
    return "".join(block.text for block in message.content if block.type == "text")


def elapsed_ms(started: float) -> float:
    return round((time.perf_counter() - started) * 1000, 1)


def api_error(error: anthropic.APIError) -> dict[str, Any]:
    """Map lỗi SDK sang {kind, message, upstream_status} cho UI. Không bao giờ log key."""
    if isinstance(error, anthropic.APITimeoutError):  # Xét trước APIConnectionError (lớp cha).
        return {"kind": "timeout", "upstream_status": None,
                "message": f"Claude không trả lời trong {config.LLM_TIMEOUT_SECONDS}s"}
    if isinstance(error, anthropic.APIConnectionError):
        return {"kind": "connection_error", "upstream_status": None,
                "message": f"Không kết nối được Claude API: {error}"}
    if isinstance(error, anthropic.APIStatusError):
        # 4xx/5xx từ Anthropic: 401 sai key, 404 sai model, 429 rate limit, 529 overloaded...
        return {"kind": error.type or "api_error", "upstream_status": error.status_code,
                "message": error.api_message or str(error)}
    return {"kind": "api_error", "message": str(error), "upstream_status": None}


def config_error() -> dict[str, Any]:
    missing = config.missing_llm_settings()
    return {"kind": "config_missing", "upstream_status": None,
            "message": f"Thiếu {', '.join(missing)} trong backend/.env"}


def failed(error: dict[str, Any], request: dict[str, Any] | None,
           api_calls: int, latency_ms: float | None = None) -> dict[str, Any]:
    return {
        "status": "failed", "request": request, "response": None, "answer": None,
        "request_id": None, "error": error,
        "metrics": {"api_calls": api_calls, "latency_ms": latency_ms,
                    "input_tokens": None, "output_tokens": None},
    }


def succeeded(request: dict[str, Any], message: Message, latency_ms: float) -> dict[str, Any]:
    if message.stop_reason != "end_turn":
        return failed(
            {"kind": "incomplete_response", "upstream_status": None,
             "message": f"stop_reason={message.stop_reason!r} không phải end_turn"},
            request, 1, latency_ms,
        )
    answer = answer_text(message).strip()
    if not answer:
        return failed(
            {"kind": "incomplete_response", "upstream_status": None,
             "message": "end_turn nhưng không có block text."},
            request, 1, latency_ms,
        )
    return {
        "status": "succeeded", "request": request,
        "response": message.to_dict(),
        "answer": answer, "request_id": message._request_id, "error": None,
        "metrics": {"api_calls": 1, "latency_ms": latency_ms,
                    "input_tokens": message.usage.input_tokens,
                    "output_tokens": message.usage.output_tokens},
    }


async def run_messages(messages: list[Turn], system: str, max_tokens: int) -> dict[str, Any]:
    if config.missing_llm_settings():
        return failed(config_error(), None, 0)
    request_body = build_request(messages, system, max_tokens)
    async with new_client() as client:
        started = time.perf_counter()
        try:
            # Điểm duy nhất gửi request tới Claude.
            message = await client.messages.create(**request_body)
        except anthropic.APIError as error:
            return failed(api_error(error), request_body, 1, elapsed_ms(started))
        latency = elapsed_ms(started)
    return succeeded(request_body, message, latency)
