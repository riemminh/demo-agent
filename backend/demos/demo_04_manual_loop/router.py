"""Endpoint của Demo 04 (prefix /api/demos/04): loop có SSE, approval, cancel và task thật.

POST /sessions · POST /sessions/{id}/runs (SSE) · POST /sessions/{id}/approvals/{aid}
POST /sessions/{id}/cancel · GET /sessions/{id} · GET /tasks · DELETE /tasks?confirm=true
Khung SSE giống Demo 01 (cùng kiểu Queue + guard), nhưng session store là của riêng demo này.
"""

import asyncio
import json
from typing import Annotated, Any

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, StringConstraints

import config
from shared import task_store
from shared.sessions import Session, SessionStore
from shared.sse_queue import stream_session_run

from .agent_loop import MAX_TURNS_LIMIT, Event, run_loop
from .scenarios import ScenarioName, prepare_scenario
from .tasks_tools import DEMO_SCOPE

router = APIRouter()
store = SessionStore()
STREAM_IDLE_TIMEOUT_SECONDS = 5.0

task_store.init_db()  # Tạo bảng nếu chưa có, ngay khi import router.


class RunRequest(BaseModel):
    scenario: ScenarioName = "normal"
    prompt: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=1000)]
    max_turns: int = Field(default=4, ge=1, le=MAX_TURNS_LIMIT)
    structured_finish: bool = False


class ApprovalDecision(BaseModel):
    approved: bool


def get_session_or_404(session_id: str) -> Session:
    session = store.get(session_id)
    if session is None:
        raise HTTPException(404, "Session not found")
    return session


async def run_turn(
    session: Session,
    scenario: ScenarioName,
    prompt: str,
    max_turns: int,
    structured_finish: bool,
    queue: asyncio.Queue[Event],
) -> None:
    def emit(event: Event) -> None:
        queue.put_nowait(event)

    async def approver(tool_name: str, tool_input: dict[str, Any]) -> bool:
        return await session.approvals.request(tool_name, tool_input, emit)

    profile = prepare_scenario(scenario, emit)

    try:
        await run_loop(
            session, prompt, max_turns, emit, approver,
            profile=profile,
            structured_finish=structured_finish or profile.structured_finish,
        )
    except asyncio.CancelledError:
        emit({"type": "error", "kind": "cancelled",
              "message": "Loop bị cancel: history KHÔNG commit. Task đã ghi trước đó "
                         "không tự rollback — xem bảng Tasks."})
    except Exception as error:
        emit({"type": "error", "kind": "internal", "message": str(error)})
    finally:
        session.approvals.deny_all_pending()
        emit({"type": "run_finished"})


@router.post("/sessions")
async def create_session() -> dict[str, str]:
    return {"id": store.create().id}


@router.get("/sessions/{session_id}")
async def get_session(session_id: str) -> dict[str, Any]:
    session = get_session_or_404(session_id)
    return {"id": session.id, "history_messages": len(session.history), "busy": session.busy}


@router.post("/sessions/{session_id}/runs")
async def start_run(request: Request, session_id: str, body: RunRequest) -> StreamingResponse:
    session = get_session_or_404(session_id)
    if session.busy:
        raise HTTPException(409, "This session is already running")
    queue: asyncio.Queue[Event] = asyncio.Queue()
    task = asyncio.create_task(
        run_turn(session, body.scenario, body.prompt, body.max_turns, body.structured_finish, queue),
    )
    session.task = task

    return StreamingResponse(
        stream_session_run(request, session, task, queue, STREAM_IDLE_TIMEOUT_SECONDS, _sse),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


def _sse(event: Event) -> str:
    return f"data: {json.dumps(event, ensure_ascii=False)}\n\n"


@router.post("/sessions/{session_id}/approvals/{approval_id}")
async def decide_approval(
    session_id: str, approval_id: str, body: ApprovalDecision
) -> dict[str, bool]:
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
    session.task.cancel()
    return {"cancelled": True}


@router.get("/tasks")
async def get_tasks() -> dict[str, Any]:
    # Đọc lại từ SQLite mỗi lần gọi; UI không tin state trong RAM.
    return {"scope": DEMO_SCOPE, "tasks": task_store.list_tasks(DEMO_SCOPE)}


@router.delete("/tasks")
async def reset_tasks(confirm: bool = False) -> dict[str, Any]:
    if not confirm:
        raise HTTPException(400, "Thiếu ?confirm=true để xóa dữ liệu demo")
    deleted = task_store.reset_scope(DEMO_SCOPE)  # Chỉ scope manual_loop.
    return {"deleted": deleted, "scope": DEMO_SCOPE, "tasks": task_store.list_tasks(DEMO_SCOPE)}
