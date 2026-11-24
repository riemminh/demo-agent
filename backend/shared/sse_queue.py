"""SSE từ Queue + asyncio.Task: phát event tới browser, hủy task khi client ngắt."""

import asyncio
from collections.abc import AsyncIterator, Callable
from typing import Any

from fastapi import Request

from .sessions import Session

Event = dict[str, Any]
SseLine = Callable[[Event], str]


async def stream_session_run(
    request: Request,
    session: Session,
    task: asyncio.Task[None],
    queue: asyncio.Queue[Event],
    idle_timeout: float,
    to_sse: SseLine,
) -> AsyncIterator[str]:
    while True:
        if await request.is_disconnected():
            session.approvals.deny_all_pending()
            if not task.done():
                task.cancel()
            return
        try:
            event = await asyncio.wait_for(queue.get(), idle_timeout)
        except TimeoutError:
            if not task.done():
                continue
            yield to_sse({"type": "error", "kind": "no_terminal_event",
                          "message": "Task kết thúc mà không gửi event cuối."})
            yield to_sse({"type": "run_finished"})
            return
        yield to_sse(event)
        if event.get("type") == "run_finished":
            return