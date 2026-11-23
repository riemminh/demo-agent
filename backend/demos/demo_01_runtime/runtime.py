"""Agent kịch bản của Demo 01: chỉ biết emit event + hỏi approver. Không import FastAPI.

Ba scenario:
- sse: stream text_delta để thấy emit -> Queue -> SSE -> browser.
- approval: dừng ở await Future; chỉ khi Approve mới ghi file sandbox thật.
- long: chạy lâu ở nhiều điểm await để Cancel hủy được Task ở backend.

Demo này KHÔNG gọi Claude. Các asyncio.sleep() là mô phỏng thời gian để quan sát
điểm await, không phải "model đang suy nghĩ".
"""

import asyncio
from collections.abc import Awaitable, Callable
from typing import Any, Literal

from .approval_note import NOTE_NAME, build_note, write_note
from .sessions import Session

Event = dict[str, Any]
EventSink = Callable[[Event], None]
Approver = Callable[[str, dict[str, Any]], Awaitable[bool]]
Scenario = Literal["sse", "approval", "long"]

WRITE_NOTE_TOOL = "write_approval_note"
LONG_RUN_STEPS = 20


async def deny_all(tool_name: str, tool_input: dict[str, Any]) -> bool:
    """Không có approver thì tool có side effect bị từ chối (fail closed)."""
    return False


async def run_turn(
    session: Session, text: str, queue: asyncio.Queue[Event], scenario: Scenario
) -> None:
    """Chạy agent trong Task riêng và đẩy mọi event của run này vào Queue."""

    def emit(event: Event) -> None:
        queue.put_nowait(event)  # Producer: event từ agent vào Queue.

    async def approver(tool_name: str, tool_input: dict[str, Any]) -> bool:
        # Agent gọi callback này -> Broker tạo Future và await quyết định của user.
        return await session.approvals.request(tool_name, tool_input, emit)

    try:
        answer = await run_agent(text, emit=emit, approver=approver, scenario=scenario)
        # Chỉ commit history khi run kết thúc bình thường.
        session.history.extend([
            {"role": "user", "content": text},
            {"role": "assistant", "content": answer},
        ])
        emit({"type": "final", "answer": answer})
    except asyncio.CancelledError:
        # Task.cancel() làm điểm await trong agent raise CancelledError; không commit history.
        emit({"type": "error", "kind": "cancelled",
              "message": "Agent đã bị cancel; history không đổi."})
    except Exception as error:
        emit({"type": "error", "kind": "internal", "message": str(error)})
    finally:
        session.approvals.deny_all_pending()
        # Consumer đang await queue.get() cần event cuối để thoát vòng lặp.
        emit({"type": "run_finished"})


async def run_agent(
    question: str,
    emit: EventSink,
    approver: Approver = deny_all,
    scenario: Scenario = "sse",
) -> str:
    emit({"type": "run_started", "scenario": scenario, "question": question})
    if scenario == "approval":
        return await _run_approval(question, emit, approver)
    if scenario == "long":
        return await _run_long(emit)
    return await _run_sse(question, emit)


async def _run_approval(question: str, emit: EventSink, approver: Approver) -> str:
    await asyncio.sleep(0.4)
    tool_input = {"file": NOTE_NAME, "content": build_note(question)}
    emit({"type": "tool_call", "tool": WRITE_NOTE_TOOL, "input": tool_input})

    # ĐIỂM DỪNG: await Future trong ApprovalBroker, cho tới khi có HTTP approve/reject.
    approved = await approver(WRITE_NOTE_TOOL, tool_input)
    if not approved:
        emit({"type": "permission", "decision": "deny", "tool": WRITE_NOTE_TOOL})
        emit({"type": "tool_result", "tool": WRITE_NOTE_TOOL, "is_error": True,
              "result": f"Không ghi {NOTE_NAME}: bị reject hoặc hết thời gian chờ."})
        return f"Rejected — {NOTE_NAME} không được tạo. Bấm Đọc lại file để kiểm chứng."

    emit({"type": "permission", "decision": "allow", "tool": WRITE_NOTE_TOOL})
    note = write_note(tool_input["content"])  # Side effect thật: ghi file lên disk.
    emit({"type": "tool_result", "tool": WRITE_NOTE_TOOL, "is_error": False,
          "result": f"Đã ghi {note['path']} ({note['size_bytes']} bytes)"})
    return f"Approved — đã ghi {note['path']}. Bấm Đọc lại file để xem nội dung từ disk."


async def _run_long(emit: EventSink) -> str:
    for step in range(1, LONG_RUN_STEPS + 1):
        # Mỗi await là một cơ hội để Task nhận CancelledError khi người dùng bấm Cancel.
        await asyncio.sleep(0.6)
        emit({"type": "progress", "step": step, "total": LONG_RUN_STEPS})
        emit({"type": "text_delta", "text": f"Bước {step}/{LONG_RUN_STEPS}… "})
    return f"Đã chạy xong {LONG_RUN_STEPS} bước mà không bị cancel."


async def _run_sse(question: str, emit: EventSink) -> str:
    await asyncio.sleep(0.6)
    emit({"type": "tool_call", "tool": "search_docs", "query": question})
    await asyncio.sleep(0.8)
    emit({"type": "tool_result", "tool": "search_docs", "result": "HTTP 429 = rate limit"})
    chunks = ["HTTP 429 ", "nghĩa là ", "bạn đã vượt quá ", "giới hạn request."]
    for chunk in chunks:
        await asyncio.sleep(0.4)
        emit({"type": "text_delta", "text": chunk})  # Browser thấy ngay, không chờ final.
    return "".join(chunks)
