"""Hạ tầng dùng chung khi gọi Claude: client, map lỗi, đo thời gian.

Demo 02 giữ bản tự chứa trong demos/demo_02_claude_api/messages.py vì nó là demo
dạy chính cách gọi API. Demo 03 trở đi dùng file này để khỏi lặp lại phần hạ tầng.
Không import FastAPI.
"""

import time
from typing import Any

import anthropic
from anthropic import AsyncAnthropic
from anthropic.types import Message

import config


def new_client() -> AsyncAnthropic:
    # max_retries=0: một lần Run chỉ gửi số request mà demo nói, không âm thầm retry.
    return AsyncAnthropic(
        api_key=config.ANTHROPIC_API_KEY,
        timeout=config.LLM_TIMEOUT_SECONDS,
        max_retries=0,
    )


def answer_text(message: Message) -> str:
    """content là LIST block: ghép các block type="text"."""
    return "".join(block.text for block in message.content if block.type == "text")


def elapsed_ms(started: float) -> float:
    return round((time.perf_counter() - started) * 1000, 1)


def api_error(error: anthropic.APIError) -> dict[str, Any]:
    """Map lỗi SDK sang {kind, message, upstream_status}. Không bao giờ log key."""
    if isinstance(error, anthropic.APITimeoutError):  # Xét trước APIConnectionError (lớp cha).
        return {"kind": "timeout", "upstream_status": None,
                "message": f"Claude không trả lời trong {config.LLM_TIMEOUT_SECONDS}s"}
    if isinstance(error, anthropic.APIConnectionError):
        return {"kind": "connection_error", "upstream_status": None,
                "message": f"Không kết nối được Claude API: {error}"}
    if isinstance(error, anthropic.APIStatusError):
        return {"kind": error.type or "api_error", "upstream_status": error.status_code,
                "message": error.api_message or str(error)}
    return {"kind": "api_error", "message": str(error), "upstream_status": None}


def config_error() -> dict[str, Any]:
    missing = config.missing_llm_settings()
    return {"kind": "config_missing", "upstream_status": None,
            "message": f"Thiếu {', '.join(missing)} trong backend/.env"}


def usage_totals(messages: list[Message]) -> dict[str, int]:
    """Cộng usage của tất cả API call trong một lần Run."""
    return {
        "input_tokens": sum(message.usage.input_tokens for message in messages),
        "output_tokens": sum(message.usage.output_tokens for message in messages),
    }
