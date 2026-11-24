"""Session + SessionStore trong RAM của process hiện tại.

Dùng chung bởi Demo 01 và Demo 04: mỗi Session giữ history đã commit, Task đang chạy
(để biết busy và để cancel) và ApprovalBroker riêng. Restart backend là mất hết session.
Vì state nằm trong RAM, chỉ chạy MỘT uvicorn worker.
Mỗi demo có store riêng nên session của demo này không thấy session của demo kia.
"""

import asyncio
import uuid
from dataclasses import dataclass, field
from typing import Any

from .approval import ApprovalBroker


@dataclass
class Session:
    id: str
    history: list[dict[str, Any]] = field(default_factory=list)
    task: asyncio.Task[None] | None = None
    approvals: ApprovalBroker = field(default_factory=ApprovalBroker)
    # Demo 08: resume SDK session, cancel qua interrupt (demo 01/04 không dùng).
    sdk_session_id: str | None = None
    cancel_event: asyncio.Event = field(default_factory=asyncio.Event)

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
