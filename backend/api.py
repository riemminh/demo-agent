"""FastAPI: SessionStore + Task + Queue + SSE trên phản hồi HTTP POST."""
import asyncio
import json
import uuid
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from typing import Any

from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from agent import Event, run_agent


@dataclass
class Session:
    id: str
    history: list[dict[str, str]] = field(default_factory=list)
    task: asyncio.Task[None] | None = None

    @property
    def busy(self) -> bool:
        return self.task is not None and not self.task.done()


class SessionStore:
    def __init__(self) -> None:
        self._sessions: dict[str, Session] = {}

    def create(self) -> Session:
        session = Session(id=uuid.uuid4().hex[:12])
        self._sessions[session.id] = session
        return session

    def get(self, session_id: str) -> Session | None:
        return self._sessions.get(session_id)


store = SessionStore()  # Kho session trong RAM cấp module: dùng chung cho mọi request trong process này.
router = APIRouter(prefix="/api")


class NewMessage(BaseModel):
    text: str = Field(min_length=1)


@router.post("/sessions")
async def create_session() -> dict[str, str]:
    session = store.create()
    return {"id": session.id}


@router.get("/sessions/{session_id}")
async def get_session(session_id: str) -> dict[str, Any]:
    session = store.get(session_id)
    if session is None:
        raise HTTPException(404, "Session not found")
    return {"id": session.id, "history": session.history, "busy": session.busy}


async def run_turn(session: Session, text: str, queue: asyncio.Queue[Event]) -> None:
    # 1. Agent chỉ gọi emit(). Phần runner quyết định event đi đâu.
    def emit(event: Event) -> None:
        queue.put_nowait(event)  # Producer: đẩy event vào Queue.

    try:
        answer = await run_agent(text, emit=emit)
        # Chỉ lưu lịch sử hội thoại khi chạy thành công.
        session.history.extend([
            {"role": "user", "content": text},
            {"role": "assistant", "content": answer},
        ])
        emit({"type": "final", "answer": answer})
    except Exception as error:
        emit({"type": "error", "message": str(error)})
    finally:
        # Quan trọng: đánh thức stream() để nó ngừng chờ Queue.get().
        emit({"type": "run_finished"})


@router.post("/sessions/{session_id}/messages")
async def send_message(session_id: str, body: NewMessage) -> StreamingResponse:
    session = store.get(session_id)
    if session is None:
        raise HTTPException(404, "Session not found")
    if session.busy:
        raise HTTPException(409, "This session is already running")

    queue: asyncio.Queue[Event] = asyncio.Queue()  # Tạo Queue mới, Mỗi tin nhắn một Queue mới.
    # 3. Khởi chạy Agent dưới dạng Task
    session.task = asyncio.create_task(run_turn(session, body.text, queue))

    async def stream() -> AsyncIterator[str]:
        while True:
            # ⭐ ĐÂY LÀ CHỖ HỨNG EVENT
            event = await queue.get()  # Consumer: tương đương "on new event"!
            # ⭐ ĐÂY LÀ CHỖ GỬI SSE
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"  # Khung SSE.
            if event["type"] == "run_finished":
                break
    # 5. FastAPI quản lý HTTP streaming            
    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    # Truy cập qua địa chỉ LAN (Next hiện "Network: http://192.168.x.x:3001")
    allow_origin_regex=r"http://192\.168\.\d{1,3}\.\d{1,3}:(3000|3001)",
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)
