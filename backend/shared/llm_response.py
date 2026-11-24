"""Kiểm tra response Claude đã hoàn chỉnh trước khi đánh dấu succeeded."""

from anthropic.types import Message

from .claude import answer_text

VALID_FINAL_STOP_REASONS = frozenset({"end_turn"})


def incomplete_reason(message: Message, *, expect_tools: bool = False) -> str | None:
    if expect_tools:
        return None
    reason = message.stop_reason
    if reason not in VALID_FINAL_STOP_REASONS:
        return f"stop_reason={reason!r} không phải end_turn"
    if any(block.type == "tool_use" for block in message.content):
        return "response vẫn chứa tool_use"
    if not answer_text(message).strip():
        return "end_turn nhưng không có block text"
    return None