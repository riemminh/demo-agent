"""Gom tool schema + execute: task SQLite, skill, file sandbox, delegate."""

import json
from collections.abc import Awaitable, Callable
from typing import Any

from .permissions import check_tool_permission
from .sandbox_io import read_sandbox_file
from .skills import load_skill_content
from .tasks_tools import Approver, execute_task_tool

Emit = Callable[[dict[str, Any]], None]


async def dispatch_tool(
    name: str,
    tool_input: dict[str, Any],
    approver: Approver,
    emit: Emit,
    turn: int,
    *,
    enforce_permissions: bool,
    permitted: frozenset[str],
    allow_delegate: bool,
    loaded_skills: set[str] | None = None,
    skill_load_enabled: bool = True,
    delegated_agents: set[str] | None = None,
) -> dict[str, Any]:
    if name == "delegate_task":
        if not allow_delegate:
            return {"is_error": True, "content": "delegate_task không được phép trong ngữ cảnh này."}
        allowed, deny = await check_tool_permission(
            name, tool_input, permitted, approver, emit, log_decisions=enforce_permissions,
        )
        if not allowed:
            return {"is_error": True, "content": deny or "denied"}
        from .subagent_loop import execute_delegate

        return await execute_delegate(
            tool_input, emit, approver, permitted, delegated_agents,
        )

    if enforce_permissions:
        allowed, deny = await check_tool_permission(
            name, tool_input, permitted, approver, emit, log_decisions=True,
        )
        if not allowed:
            return {"is_error": True, "content": deny or "denied"}
        return await execute_task_tool(
            name, tool_input, _always_approve, skip_approval=(name == "create_task"),
        )
    if name == "load_skill":
        from .skills import LOAD_SKILL_NEXT, skill_body_without_frontmatter

        if not skill_load_enabled:
            return {
                "is_error": True,
                "content": (
                    "load_skill đã tắt sau khi nạp skill. "
                    "Nội dung SKILL đã nằm trong system. Gọi list_tasks hoặc trả lời kế hoạch bằng text."
                ),
            }
        skill_name = str(tool_input.get("name", "")).strip()
        cache = loaded_skills if loaded_skills is not None else set()
        if skill_name in cache:
            emit({"type": "skill_already_loaded", "turn": turn, "name": skill_name})
            payload = {
                "name": skill_name,
                "already_loaded": True,
                "message": "Skill đã nạp ở lượt trước. Không gọi load_skill lại.",
                "reminder": skill_body_without_frontmatter(skill_name),
                "next_step": LOAD_SKILL_NEXT,
            }
            return {"is_error": False, "content": json.dumps(payload, ensure_ascii=False)}
        content = load_skill_content(skill_name)
        if content is None:
            return {"is_error": True, "content": f"Skill không tìm thấy: {skill_name}"}
        cache.add(skill_name)
        emit({"type": "skill_loaded", "turn": turn, "name": skill_name, "chars": len(content)})
        payload = {"name": skill_name, "body": content, "next_step": LOAD_SKILL_NEXT}
        return {"is_error": False, "content": json.dumps(payload, ensure_ascii=False)}
    if name == "read_file":
        return read_sandbox_file(str(tool_input.get("path", "")))

    return await execute_task_tool(name, tool_input, approver if not enforce_permissions else _always_approve)


async def _always_approve(_tool: str, _input: dict[str, Any]) -> bool:
    return True