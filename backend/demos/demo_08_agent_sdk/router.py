"""Endpoint của Demo 08 (prefix /api/demos/08): Claude Agent SDK thật.

POST /sessions · POST /sessions/{id}/runs (SSE) · POST /sessions/{id}/approvals/{aid}
GET  /env    -> prerequisites: CLI, key, phiên bản SDK (để UI báo nếu môi trường thiếu)
GET  /tasks · POST /seed · DELETE /tasks?confirm=true -> sandbox scope agent_sdk
"""

import asyncio
import json
from typing import Annotated, Any, Literal

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, StringConstraints

from shared import task_store
from shared.sessions import Session, SessionStore
from shared.sse_queue import stream_session_run

from .environment import env_summary
from .sdk_agent import inspect_session, run_turn
from .sdk_tools import DEMO_SCOPE

router = APIRouter()
store = SessionStore()
STREAM_IDLE_TIMEOUT_SECONDS = 10.0  # SDK spawn CLI nên lượt đầu chậm hơn các demo khác.



task_store.init_db()

Scenario = Literal["basic", "permissions", "skills", "subagents"]


class RunRequest(BaseModel):
    scenario: Scenario
    prompt: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=1000)]


class ApprovalDecision(BaseModel):
    approved: bool


def get_session_or_404(session_id: str) -> Session:
    session = store.get(session_id)
    if session is None:
        raise HTTPException(404, "Session not found")
    return session


@router.get("/env")
async def get_env() -> dict[str, Any]:
    """Prerequisites của demo này; UI báo rõ nếu môi trường chưa đủ."""
    return env_summary()


class InspectRequest(BaseModel):
    scenario: Scenario


@router.post("/inspect")
async def post_inspect(body: InspectRequest) -> dict[str, Any]:
    """Spawn CLI + initialize để xem options đã tới SDK; KHÔNG gọi model."""
    try:
        return await asyncio.wait_for(inspect_session(body.scenario), 30.0)
    except TimeoutError as error:
        raise HTTPException(504, "SDK không initialize trong 30s") from error
    except Exception as error:
        raise HTTPException(502, f"SDK lỗi: {type(error).__name__}: {str(error)[:200]}") from error


@router.post("/sessions")
async def create_session() -> dict[str, str]:
    return {"id": store.create().id}


@router.post("/sessions/{session_id}/runs")
async def start_run(request: Request, session_id: str, body: RunRequest) -> StreamingResponse:
    session = get_session_or_404(session_id)
    if session.busy:
        raise HTTPException(409, "This session is already running")
    queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
    task = asyncio.create_task(run_turn(session, body.scenario, body.prompt, queue))
    session.task = task

    return StreamingResponse(
        stream_session_run(request, session, task, queue, STREAM_IDLE_TIMEOUT_SECONDS, _sse),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


def _sse(event: dict[str, Any]) -> str:
    return f"data: {json.dumps(event, ensure_ascii=False, default=str)}\n\n"


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
    session.cancel_event.set()  # client.interrupt() trong run_query.
    session.task.cancel()
    return {"cancelled": True}


@router.get("/tasks")
async def get_tasks() -> dict[str, Any]:
    return {"scope": DEMO_SCOPE, "tasks": task_store.list_tasks(DEMO_SCOPE)}


@router.delete("/tasks")
async def reset_tasks(confirm: bool = False) -> dict[str, Any]:
    if not confirm:
        raise HTTPException(400, "Thiếu ?confirm=true để xóa dữ liệu demo")
    deleted = task_store.reset_scope(DEMO_SCOPE)
    return {"scope": DEMO_SCOPE, "deleted": deleted, "tasks": task_store.list_tasks(DEMO_SCOPE)}
