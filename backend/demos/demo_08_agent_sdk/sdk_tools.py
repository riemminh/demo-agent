"""Tool in-process cho Claude Agent SDK: một MCP server chạy ngay trong process Python.

Khác Demo 07 (server riêng qua stdio): ở đây `create_sdk_mcp_server` gắn tool trực tiếp
vào SDK, nên không có subprocess nào. Tool ghi dữ liệu KHÔNG tự hỏi approval — việc đó
do `can_use_tool` của SDK làm trước khi tool được chạy (xem customization.py).
"""

import json
from typing import Any

from claude_agent_sdk import create_sdk_mcp_server, tool

from shared import task_store

DEMO_SCOPE = "agent_sdk"  # Scope riêng: không đụng manual_loop (04) hay mcp (07).
PRIORITIES = ("low", "medium", "high")


def _text(payload: Any) -> dict[str, Any]:
    return {"content": [{"type": "text", "text": json.dumps(payload, ensure_ascii=False)}]}


def _error(message: str) -> dict[str, Any]:
    return {"content": [{"type": "text", "text": message}], "is_error": True}


@tool("list_tasks", "Liệt kê task hiện có trong sandbox (id, title, priority, status).", {})
async def list_tasks(args: dict[str, Any]) -> dict[str, Any]:
    return _text(task_store.list_tasks(DEMO_SCOPE))


@tool(
    "create_task",
    "Tạo một task mới. Hành động ghi dữ liệu, cần người dùng cho phép trước.",
    {"title": str, "priority": str},
)
async def create_task(args: dict[str, Any]) -> dict[str, Any]:
    title = str(args.get("title", "")).strip()
    priority = str(args.get("priority", "")).strip().lower()
    if not title:
        return _error("title không được rỗng")
    if priority not in PRIORITIES:
        return _error(f"priority phải thuộc {PRIORITIES}, nhận {priority!r}")
    created = task_store.create_task(DEMO_SCOPE, title, priority)
    return _text(created)  # Đọc lại từ DB rồi trả về.


def build_tool_server() -> Any:
    return create_sdk_mcp_server(name="tasks", version="1.0.0",
                                 tools=[list_tasks, create_task])


# Tên tool mà SDK dùng: mcp__<server>__<tool>.
LIST_TOOL = "mcp__tasks__list_tasks"
CREATE_TOOL = "mcp__tasks__create_task"
ALL_TOOLS = [LIST_TOOL, CREATE_TOOL]
