"""Lesson 06 — Basic Messages API.

Đúng MỘT lần gọi client.messages.create() rồi trả kết quả qua REST.
Không Session, Queue, SSE hay Agent Loop. File này không import FastAPI:
nhận input đã validate, trả dict; web layer (playground_api.py) lo HTTP.
"""
import time
from typing import Any

import anthropic
from anthropic import AsyncAnthropic

import config


def _failed(
    kind: str, message: str, request: dict[str, Any] | None, api_calls: int,
    latency_ms: float | None = None, upstream_status: int | None = None,
    request_id: str | None = None,
) -> dict[str, Any]:
    return {
        "status": "failed",
        "request": request,
        "response": None,
        "answer": None,
        "request_id": request_id,
        "metrics": {"api_calls": api_calls, "latency_ms": latency_ms,
                    "input_tokens": None, "output_tokens": None},
        "error": {"kind": kind, "message": message, "upstream_status": upstream_status},
    }


def _elapsed_ms(started: float) -> float:
    return round((time.perf_counter() - started) * 1000, 1)


async def run_messages_api(prompt: str, system: str, max_tokens: int) -> dict[str, Any]:
    missing = config.missing_llm_settings()
    if missing:
        # Thiếu config thì KHÔNG gọi API, nên api_calls = 0.
        return _failed("config_missing",
                       f"Thiếu {', '.join(missing)} trong backend/.env", None, 0)

    # BREAKPOINT 1: đây chính là body truyền vào messages.create (không chứa API key).
    request_body: dict[str, Any] = {
        "model": config.LLM_MODEL,
        "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": prompt}],
        # Tắt extended thinking: thinking token tính vào max_tokens, có thể ăn hết trần
        # và response chỉ còn block "thinking", không có text để làm draft.
        "thinking": {"type": "disabled"},
    }
    if system:
        # system là tham số top-level, không phải một role trong messages.
        request_body["system"] = system

    # max_retries=0: mỗi lần Run chỉ gửi đúng 1 HTTP request. Retry học ở Lesson 11.
    async with AsyncAnthropic(
        api_key=config.ANTHROPIC_API_KEY,
        timeout=config.LLM_TIMEOUT_SECONDS,
        max_retries=0,
    ) as client:
        started = time.perf_counter()
        try:
            # BREAKPOINT 2: điểm duy nhất gửi request tới Claude.
            message = await client.messages.create(**request_body)
        except anthropic.APITimeoutError:  # Phải bắt trước APIConnectionError (lớp cha).
            return _failed("timeout", f"Claude không trả lời trong {config.LLM_TIMEOUT_SECONDS}s",
                           request_body, 1, _elapsed_ms(started))
        except anthropic.APIConnectionError as error:
            return _failed("connection_error", f"Không kết nối được Claude API: {error}",
                           request_body, 1, _elapsed_ms(started))
        except anthropic.APIStatusError as error:
            # 4xx/5xx từ Anthropic: 401 sai key, 404 sai model, 429 rate limit, 529 overloaded...
            return _failed(error.type or "api_error", error.api_message or str(error),
                           request_body, 1, _elapsed_ms(started),
                           upstream_status=error.status_code, request_id=error.request_id)
        latency_ms = _elapsed_ms(started)

    # BREAKPOINT 3: message là object SDK parse từ JSON. content là LIST block, không phải string.
    answer = "".join(block.text for block in message.content if block.type == "text")
    return {
        "status": "succeeded",
        "request": request_body,
        "response": message.to_dict(),  # Các field API thực sự trả về.
        "answer": answer,
        "request_id": message._request_id,
        "metrics": {
            "api_calls": 1,
            "latency_ms": latency_ms,
            "input_tokens": message.usage.input_tokens,
            "output_tokens": message.usage.output_tokens,
        },
        "error": None,
    }
