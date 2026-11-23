"""Ba tool của Demo 04, chạy trên SQLite thật (scope `manual_loop`).

`list_tasks` và `get_task` chỉ đọc. `create_task` GHI dữ liệu nên bắt buộc có
người duyệt trước: không approve thì không INSERT (fail closed).
"""

import json
from collections.abc import Awaitable, Callable
from typing import Any, Literal

from pydantic import BaseModel, Field, ValidationError

from shared import task_store

DEMO_SCOPE = "manual_loop"

Approver = Callable[[str, dict[str, Any]], Awaitable[bool]]

TOOL_SCHEMAS: list[dict[str, Any]] = [
    {
        "name": "list_tasks",
        "description": "Liệt kê tất cả task hiện có (id, title, priority, status). Không cần input.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "create_task",
        "description": "Tạo một task mới. Hành động này ghi dữ liệu nên cần người dùng phê duyệt.",
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Tiêu đề task"},
                "priority": {"type": "string", "enum": ["low", "medium", "high"]},
            },
            "required": ["title", "priority"],
        },
    },
    {
        "name": "get_task",
        "description": "Đọc một task theo id. Trả lỗi nếu id không tồn tại.",
        "input_schema": {
            "type": "object",
            "properties": {"task_id": {"type": "integer", "description": "ID của task"}},
            "required": ["task_id"],
        },
    },
]


class CreateTaskInput(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    priority: Literal["low", "medium", "high"]


class GetTaskInput(BaseModel):
    task_id: int = Field(ge=1)


def _ok(content: Any, **extra: Any) -> dict[str, Any]:
    return {"is_error": False, "content": json.dumps(content, ensure_ascii=False), **extra}


def _error(content: str) -> dict[str, Any]:
    return {"is_error": True, "content": content}


async def execute_tool(
    name: str, tool_input: dict[str, Any], approver: Approver
) -> dict[str, Any]:
    """Trả {is_error, content, created_id?}. Lỗi tool là dữ liệu trả cho model."""
    if name == "list_tasks":
        return _ok(task_store.list_tasks(DEMO_SCOPE))

    if name == "get_task":
        try:
            validated = GetTaskInput(**tool_input)
        except (ValidationError, TypeError) as error:
            return _error(f"Input không hợp lệ cho get_task: {error}")
        task = task_store.get_task(DEMO_SCOPE, validated.task_id)
        if task is None:
            # Lỗi nghiệp vụ thật: id không tồn tại trong DB.
            return _error(f"TaskNotFound: không có task id={validated.task_id}")
        return _ok(task)

    if name == "create_task":
        try:
            validated = CreateTaskInput(**tool_input)
        except (ValidationError, TypeError) as error:
            return _error(f"Input không hợp lệ cho create_task: {error}")
        # ĐIỂM DỪNG: await Future tới khi người dùng Approve/Reject.
        approved = await approver(name, validated.model_dump())
        if not approved:
            return _error("Người dùng không phê duyệt create_task nên không ghi gì vào DB.")
        created = task_store.create_task(DEMO_SCOPE, validated.title, validated.priority)
        return _ok(created, created_id=created["id"])

    return _error(f"Unknown tool: {name}")
