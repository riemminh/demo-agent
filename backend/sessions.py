"""Session + SessionStore trong RAM (tách từ api.py, giữ nguyên behavior).

Mỗi Session giữ history đã commit, Task đang chạy (để biết busy và cancel)
và ApprovalBroker riêng. Restart backend thì mất toàn bộ session.
"""
import asyncio
import uuid
from dataclasses import dataclass, field

from approvals import ApprovalBroker


@dataclass
class Session:
    id: str
    history: list[dict[str, str]] = field(default_factory=list)
    task: asyncio.Task[None] | None = None
    approvals: ApprovalBroker = field(default_factory=ApprovalBroker)

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
