"""Agent giả lập: chỉ biết emit + approver, không import FastAPI/Queue.

Ba kịch bản:
- sse: giữ nguyên demo stream ban đầu.
- approval: yêu cầu phê duyệt trước khi giả lập một tool có side effect.
- long: chạy lâu để người học nhấn Cancel và quan sát Task bị hủy.
"""
import asyncio
from collections.abc import Awaitable, Callable
from typing import Any, Literal

Event = dict[str, Any]
EventSink = Callable[[Event], None]
Approver = Callable[[str, dict[str, Any]], Awaitable[bool]]
Scenario = Literal["sse", "approval", "long"]


async def deny_all(tool_name: str, tool_input: dict[str, Any]) -> bool:
    """Không tự chạy tool có side effect nếu không có approver."""
    return False


async def run_agent(
    question: str,
    emit: EventSink,
    approver: Approver = deny_all,
    scenario: Scenario = "sse",
) -> str:
    emit({"type": "run_started", "scenario": scenario, "question": question})

    if scenario == "approval":
        await asyncio.sleep(0.5)
        tool_input = {"title": f"Support ticket: {question}", "priority": "normal"}
        emit({"type": "tool_call", "tool": "create_ticket_draft", "input": tool_input})

        # ĐIỂM DỪNG: chờ Future trong ApprovalBroker có True/False.
        approved = await approver("create_ticket_draft", tool_input)
        if not approved:
            emit({"type": "permission", "decision": "deny", "tool": "create_ticket_draft"})
            emit({"type": "tool_result", "tool": "create_ticket_draft", "is_error": True,
                  "result": "Không thực hiện: đã reject hoặc hết thời gian chờ."})
            return "User không chấp thuận. Ticket chưa được tạo."

        emit({"type": "permission", "decision": "allow", "tool": "create_ticket_draft"})
        await asyncio.sleep(0.7)  # Giả lập tool, KHÔNG gọi dịch vụ thật.
        emit({"type": "tool_result", "tool": "create_ticket_draft", "is_error": False,
              "result": "Demo ticket draft created (simulated)"})
        return "Đã approve và giả lập tạo ticket draft thành công."

    if scenario == "long":
        # Mỗi await là cơ hội để Task nhận CancelledError khi nhấn Cancel.
        for step in range(1, 21):
            await asyncio.sleep(0.6)
            emit({"type": "progress", "step": step, "total": 20})
            emit({"type": "text_delta", "text": f"Bước {step}/20… "})
        return "Đã chạy xong 20 bước mà không bị cancel."

    # Demo SSE ban đầu: giữ nguyên flow học emit → queue → yield → reader.read().
    await asyncio.sleep(0.6)
    emit({"type": "tool_call", "tool": "search_docs", "query": question})
    await asyncio.sleep(0.8)
    emit({"type": "tool_result", "tool": "search_docs", "result": "HTTP 429 = rate limit"})
    chunks = ["HTTP 429 ", "nghĩa là ", "bạn đã vượt quá ", "giới hạn request."]
    for chunk in chunks:
        await asyncio.sleep(0.4)
        emit({"type": "text_delta", "text": chunk})
    return "".join(chunks)
