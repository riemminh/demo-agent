"""FastAPI: SessionStore + Task + Queue + SSE + Approval + Cancel.

Runtime web của các demo nền tảng (Module 1), gom một file để học.
Session/SessionStore nằm ở sessions.py.
"""
import asyncio
import json
from collections.abc import AsyncIterator
from typing import Any

from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from agent import Event, Scenario, run_agent
from playground_api import router as playground_router
from sessions import Session, SessionStore

store = SessionStore()  # Một store trong RAM của process hiện tại.
router = APIRouter(prefix="/api")


class NewMessage(BaseModel):
    text: str = Field(min_length=1)
    scenario: Scenario = "sse"  # Mặc định giữ nguyên kịch bản SSE cũ.


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


async def run_turn(
    session: Session, text: str, queue: asyncio.Queue[Event], scenario: Scenario
) -> None:
    def emit(event: Event) -> None:
        queue.put_nowait(event)  # Producer: event từ agent vào Queue.

    async def approver(tool_name: str, tool_input: dict[str, Any]) -> bool:
        # Agent gọi callback này -> Broker tạo Future và await user decision.
        return await session.approvals.request(tool_name, tool_input, emit)

    try:
        answer = await run_agent(text, emit=emit, approver=approver, scenario=scenario)
        # Chỉ commit history nếu Agent hoàn thành bình thường.
        session.history.extend([
            {"role": "user", "content": text},
            {"role": "assistant", "content": answer},
        ])
        emit({"type": "final", "answer": answer})
    except asyncio.CancelledError:
        # asyncio.Task.cancel() khiến điểm await bên trong agent raise CancelledError.
        # Đừng commit history của run bị hủy.
        emit({"type": "error", "kind": "cancelled", "message": "Agent đã bị cancel; history không đổi."})
    except Exception as error:
        emit({"type": "error", "kind": "internal", "message": str(error)})
    finally:
        session.approvals.deny_all_pending()
        # Consumer đang await queue.get() cần event cuối để thoát vòng lặp.
        emit({"type": "run_finished"})


@router.post("/sessions/{session_id}/messages")
async def send_message(session_id: str, body: NewMessage) -> StreamingResponse:
    session = get_session_or_404(session_id)
    if session.busy:
        raise HTTPException(409, "This session is already running")

    queue: asyncio.Queue[Event] = asyncio.Queue()  # Mỗi request một Queue.
    session.task = asyncio.create_task(
        run_turn(session, body.text, queue, body.scenario)
    )

    async def stream() -> AsyncIterator[str]:
        while True:
            event = await queue.get()  # <-- BACKEND CONSUMER: hứng event.
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
            if event["type"] == "run_finished":
                break

    return StreamingResponse(
        stream(), media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/sessions/{session_id}/approvals/{approval_id}")
async def decide_approval(
    session_id: str, approval_id: str, body: ApprovalDecision
) -> dict[str, bool]:
    # Request HTTP thứ HAI, trong khi POST /messages vẫn đang stream SSE.
    session = get_session_or_404(session_id)
    if not session.approvals.resolve(approval_id, body.approved):
        raise HTTPException(404, "Approval is no longer pending")
    return {"resolved": True}


@router.post("/sessions/{session_id}/cancel")
async def cancel_agent(session_id: str) -> dict[str, bool]:
    session = get_session_or_404(session_id)
    if not session.busy or session.task is None:
        return {"cancelled": False}
    session.approvals.deny_all_pending()
    session.task.cancel()  # <-- Hủy AGENT TASK ở backend; không chỉ đóng fetch.
    return {"cancelled": True}


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", "http://localhost:3001",
        "http://127.0.0.1:3000", "http://127.0.0.1:3001",
    ],
    allow_origin_regex=r"http://192\.168\.\d{1,3}\.\d{1,3}:(3000|3001)",
    allow_methods=["*"], allow_headers=["*"],
)
app.include_router(router)
app.include_router(playground_router)  # /api/health, /api/claude-api/...
