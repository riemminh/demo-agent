"""Phân loại tool: Read auto-allow · Write cần approval · Unknown deny (Python, không chỉ prompt)."""

from collections.abc import Awaitable, Callable
from typing import Any

Approver = Callable[[str, dict[str, Any]], Awaitable[bool]]
Emit = Callable[[dict[str, Any]], None]

READ_TOOLS = frozenset({"list_tasks", "get_task", "load_skill", "read_file"})
WRITE_TOOLS = frozenset({"create_task"})
DELEGATE_TOOLS = frozenset({"delegate_task"})


async def check_tool_permission(
    tool_name: str,
    tool_input: dict[str, Any],
    permitted: frozenset[str],
    approver: Approver,
    emit: Emit,
    *,
    log_decisions: bool,
) -> tuple[bool, str | None]:
    """Trả (allowed, deny_message). deny_message có nội dung khi bị chặn."""
    if log_decisions:
        emit({"type": "permission_requested", "tool": tool_name, "input": tool_input})

    if tool_name not in permitted:
        reason = "tool không thuộc scenario hoặc không được phép"
        if log_decisions:
            emit({"type": "permission_decided", "tool": tool_name, "allowed": False, "reason": reason})
        return False, f"Permission denied: {reason}"

    if tool_name in READ_TOOLS or tool_name in DELEGATE_TOOLS:
        if log_decisions:
            emit({"type": "permission_decided", "tool": tool_name, "allowed": True,
                  "reason": "read/delegate — không ghi SQLite"})
        return True, None

    if tool_name in WRITE_TOOLS:
        approved = await approver(tool_name, tool_input)
        if log_decisions:
            emit({"type": "permission_decided", "tool": tool_name, "allowed": approved,
                  "reason": "người dùng quyết định cho tool ghi"})
        if approved:
            return True, None
        return False, "Người dùng không phê duyệt create_task nên không ghi gì vào DB."

    reason = f"unknown tool class: {tool_name}"
    if log_decisions:
        emit({"type": "permission_decided", "tool": tool_name, "allowed": False, "reason": reason})
    return False, f"Permission denied: {reason}"