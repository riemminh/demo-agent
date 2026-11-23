"""Streaming của Demo 02: Claude → Python (messages.stream) → event → SSE → browser.

Hai tầng stream khác nhau: tầng trên là HTTP stream của Anthropic SDK, tầng dưới là
SSE của backend này. Event ở đây đều có thật, không dựng thêm bước nào.
"""

import time
from collections.abc import AsyncIterator
from typing import Any

import anthropic

import config
from .messages import (
    Turn, answer_text, api_error, build_request, config_error, elapsed_ms, new_client,
)


async def stream_events(
    messages: list[Turn], system: str, max_tokens: int
) -> AsyncIterator[dict[str, Any]]:
    """Yield event theo đúng tiến trình thực tế; event cuối luôn là run_finished."""
    if config.missing_llm_settings():
        yield {"type": "error", **config_error()}  # Chưa cấu hình thì không gọi API.
        yield {"type": "run_finished"}
        return

    request_body = build_request(messages, system, max_tokens)
    yield {"type": "request_sent", "request": request_body}
    started = time.perf_counter()
    error: dict[str, Any] | None = None
    final_event: dict[str, Any] | None = None
    try:
        async with new_client() as client:
            # SDK mở một HTTP stream; text_stream chỉ đưa ra phần text delta.
            async with client.messages.stream(**request_body) as stream:
                async for text in stream.text_stream:
                    yield {"type": "text_delta", "text": text}
                # Lấy final message để có stop_reason và usage ĐÚNG (delta không có).
                final = await stream.get_final_message()
        final_event = {
            "type": "final",
            "answer": answer_text(final),
            "response": final.to_dict(),
            "metrics": {"api_calls": 1, "latency_ms": elapsed_ms(started),
                        "input_tokens": final.usage.input_tokens,
                        "output_tokens": final.usage.output_tokens},
        }
    except anthropic.APIError as caught:
        error = {**api_error(caught), "latency_ms": elapsed_ms(started)}

    # Yield ngoài try/finally: tránh yield trong finally khi browser đã đóng stream.
    if final_event:
        yield final_event
    if error:
        yield {"type": "error", **error}
    yield {"type": "run_finished"}
