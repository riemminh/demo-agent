"""Agent demo: phát sự kiện runtime mà không import FastAPI hay Queue."""
import asyncio
from collections.abc import Callable
from typing import Any

Event = dict[str, Any]
EventSink = Callable[[Event], None]


async def run_agent(question: str, emit: EventSink) -> str:
    emit({"type": "run_started", "question": question})

    # Giả lập tìm tài liệu. Thay các sleep này bằng LLM/tool thật.
    await asyncio.sleep(0.6)
    emit({"type": "tool_call", "tool": "search_docs", "query": question})

    await asyncio.sleep(0.8)
    emit({"type": "tool_result", "tool": "search_docs", "result": "HTTP 429 = rate limit"})

    chunks = ["HTTP 429 ", "nghĩa là ", "bạn đã vượt quá ", "giới hạn request."]
    for chunk in chunks:
        await asyncio.sleep(0.4)
        emit({"type": "text_delta", "text": chunk})

    return "".join(chunks)
