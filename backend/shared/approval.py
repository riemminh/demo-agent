"""ApprovalBroker: chờ quyết định Approve/Reject của người dùng bằng asyncio.Future.

Dùng chung bởi Demo 01 (ghi file sandbox) và Demo 04 (ghi task vào SQLite).

Broker không mở HTTP/SSE. Nó CHỈ:
1. Tạo Future, lưu theo approval_id.
2. Emit event yêu cầu người dùng phê duyệt.
3. await Future; một request HTTP khác gọi resolve() để trả kết quả.
Hết timeout thì fail closed (coi như reject).
"""

import asyncio
import uuid
from collections.abc import Callable
from typing import Any

# Khai báo tại đây (không import từ runtime.py) để runtime.py import được sessions.py.
EventSink = Callable[[dict[str, Any]], None]
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
            approved = False  # Fail closed: không ghi file khi không ai trả lời.
            emit({"type": "approval_timeout", "approval_id": approval_id})
        finally:
            # Cả khi Task bị cancel, không để lại Future mồ côi trong _pending.
            self._pending.pop(approval_id, None)
        emit({"type": "approval_decision", "approval_id": approval_id, "approved": approved})
        return approved

    def resolve(self, approval_id: str, approved: bool) -> bool:
        """Endpoint POST /approvals dùng hàm này để đánh thức Agent."""
        future = self._pending.get(approval_id)
        if future is None or future.done():
            return False
        future.set_result(approved)  # <-- Agent đang await Future sẽ chạy tiếp.
        return True

    def deny_all_pending(self) -> None:
        """Dọn các yêu cầu chưa trả lời khi run bị cancel hoặc kết thúc."""
        for future in self._pending.values():
            if not future.done():
                future.set_result(False)
