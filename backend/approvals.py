"""Giống app/core/approvals.py trong repo chính, nhưng rút gọn để dễ học.

ApprovalBroker không mở HTTP/SSE. Nó CHỈ:
1. Tạo Future, lưu theo approval_id.
2. Emit event yêu cầu người dùng phê duyệt.
3. await Future; một request API khác sẽ gọi resolve() để trả kết quả.
"""
import asyncio
import uuid
from typing import Any

from agent import EventSink

APPROVAL_TIMEOUT_SECONDS = 120


class ApprovalBroker:
    def __init__(self, timeout_seconds: float = APPROVAL_TIMEOUT_SECONDS) -> None:
        self.timeout_seconds = timeout_seconds
        self._pending: dict[str, asyncio.Future[bool]] = {}

    async def request(
        self, tool_name: str, tool_input: dict[str, Any], emit: EventSink
    ) -> bool:
        approval_id = uuid.uuid4().hex[:12]
        future: asyncio.Future[bool] = asyncio.get_running_loop().create_future()
        self._pending[approval_id] = future

        emit({"type": "approval_required", "approval_id": approval_id,
              "tool": tool_name, "input": tool_input,
              "timeout_seconds": self.timeout_seconds})

        try:
            # Agent tạm dừng tại đây. Event loop vẫn xử lý POST /approvals.
            approved = await asyncio.wait_for(future, timeout=self.timeout_seconds)
        except TimeoutError:
            approved = False  # Fail closed.
            emit({"type": "approval_timeout", "approval_id": approval_id})
        finally:
            # Cả khi task bị cancel, không để lại Future trong _pending.
            self._pending.pop(approval_id, None)

        emit({"type": "approval_decision", "approval_id": approval_id, "approved": approved})
        return approved

    def resolve(self, approval_id: str, approved: bool) -> bool:
        """Endpoint POST /approvals dùng hàm này để đánh thức Agent."""
        future = self._pending.get(approval_id)
        if future is None or future.done():
            return False
        future.set_result(approved)  # <-- Agent đang await Future sẽ tiếp tục.
        return True

    def deny_all_pending(self) -> None:
        """Dọn những yêu cầu approval chưa được trả lời khi cancel/kết thúc."""
        for future in self._pending.values():
            if not future.done():
                future.set_result(False)
