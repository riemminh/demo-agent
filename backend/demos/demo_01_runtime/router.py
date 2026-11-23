"""Endpoint của Demo 01 (prefix /api/demos/01): sessions, runs (SSE), approvals,
cancel và file sandbox (đọc lại / xóa). Handler mỏng; logic nằm ở runtime.py.
"""

import asyncio
import json
from collections.abc import AsyncIterator
from typing import Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from shared.sessions import Session, SessionStore

from .approval_note import delete_note, read_note
from .runtime import Event, Scenario, run_turn


router = APIRouter()
store = SessionStore()  # Một store cho process hiện tại.

# Nếu Task chết mà chưa kịp emit (vd cancel ngay sau create_task), stream không được chờ mãi.
STREAM_IDLE_TIMEOUT_SECONDS = 5.0


class RunRequest(BaseModel):
    text: str = Field(min_length=1, max_length=500)
    scenario: Scenario = "sse"


class ApprovalDecision(BaseModel):
    approved: bool


def get_session_or_404(session_id: str) -> Session:
    session = store.get(session_id)
    if session is None:
        raise HTTPException(404, "Session not found")
    return session


@router.post("/sessions")
async def create_session() -> dict[str, str]:
    return {"id": store.create().id}


@router.get("/sessions/{session_id}")
async def get_session(session_id: str) -> dict[str, Any]:
    session = get_session_or_404(session_id)
    return {"id": session.id, "history": session.history, "busy": session.busy}


@router.post("/sessions/{session_id}/runs")
async def start_run(session_id: str, body: RunRequest) -> StreamingResponse:
    session = get_session_or_404(session_id)
    if session.busy:
        raise HTTPException(409, "This session is already running")

    queue: asyncio.Queue[Event] = asyncio.Queue()  # Mỗi run một Queue riêng.
    task = asyncio.create_task(run_turn(session, body.text, queue, body.scenario))
    session.task = task  # create_task, KHÔNG await: handler trả response ngay.

    async def stream() -> AsyncIterator[str]:
        while True:
            try:
                # BACKEND CONSUMER: hứng event. Có timeout vì nếu Task bị cancel
                # trước khi thân run_turn chạy thì finally không chạy -> không có
                # event cuối, stream sẽ treo.
                event = await asyncio.wait_for(queue.get(), STREAM_IDLE_TIMEOUT_SECONDS)
            except TimeoutError:
                if not task.done():
                    continue  # Vẫn đang chạy (vd đang chờ approval): tiếp tục chờ.
                yield _sse({"type": "error", "kind": "no_terminal_event",
                            "message": "Task kết thúc mà không gửi event cuối."})
                yield _sse({"type": "run_finished"})
                return
            yield _sse(event)
            if event["type"] == "run_finished":
                return

    return StreamingResponse(
        stream(), media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


def _sse(event: Event) -> str:
    return f"data: {json.dumps(event, ensure_ascii=False)}\n\n"


@router.post("/sessions/{session_id}/approvals/{approval_id}")
async def decide_approval(
    session_id: str, approval_id: str, body: ApprovalDecision
) -> dict[str, bool]:
    # Request HTTP THỨ HAI, trong khi POST /runs vẫn đang stream SSE.
    session = get_session_or_404(session_id)
    if not session.approvals.resolve(approval_id, body.approved):
        raise HTTPException(404, "Approval is no longer pending")
    return {"resolved": True}


@router.post("/sessions/{session_id}/cancel")
async def cancel_run(session_id: str) -> dict[str, bool]:
    session = get_session_or_404(session_id)
    if not session.busy or session.task is None:
        return {"cancelled": False}
    session.approvals.deny_all_pending()
    session.task.cancel()  # <-- Hủy Task ở backend, không chỉ đóng fetch ở browser.
    return {"cancelled": True}


@router.get("/file")
async def get_approval_note() -> dict[str, Any]:
    return read_note()  # Đọc lại từ disk mỗi lần gọi.


@router.delete("/file")
async def reset_approval_note(confirm: bool = False) -> dict[str, Any]:
    # Xóa file là hành động mất dữ liệu: bắt buộc ?confirm=true từ UI.
    if not confirm:
        raise HTTPException(400, "Thiếu ?confirm=true để xóa file sandbox")
    existed = delete_note()
    return {"deleted": existed, **read_note()}
