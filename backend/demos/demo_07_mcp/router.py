"""Endpoint của Demo 07 (prefix /api/demos/07): bridge UI → MCP Client → MCP Server.

POST /discover          -> spawn server qua stdio, initialize, tools/list
POST /call-tool         -> tools/call với tool do server công bố
POST /resources-prompts -> resources/list + read, prompts/list + get
POST /seed · GET /tasks · DELETE /tasks?confirm=true -> dữ liệu sandbox scope "mcp"
Bridge luôn gọi server CỐ ĐỊNH trong mcp_client.py; UI không gửi command nào.
Demo này KHÔNG cần Claude key.
"""

from typing import Annotated, Any, Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, StringConstraints

from shared import task_store

from . import mcp_client
from .mcp_server import DEMO_SCOPE

router = APIRouter()

task_store.init_db()

# Task mẫu để nút Seed tạo — dữ liệu seed, không phải do model sinh.
SEED_TASKS = [
    ("Thiết lập MCP server", "high"),
    ("Viết client stdio", "medium"),
    ("Thử resource và prompt", "low"),
]


class CallToolRequest(BaseModel):
    # Allowlist tên tool: tránh để UI gọi bất kỳ thứ gì.
    name: Literal["list_tasks", "get_task"]
    task_id: int | None = Field(default=None, ge=1)


class PromptRequest(BaseModel):
    goal: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]


def _mcp_error(error: Exception) -> HTTPException:
    # Lỗi spawn/initialize/protocol: báo 502, không trả traceback ra UI.
    return HTTPException(502, f"MCP session lỗi: {type(error).__name__}: {error}")


@router.post("/discover")
async def post_discover() -> dict[str, Any]:
    try:
        return await mcp_client.discover()
    except Exception as error:
        raise _mcp_error(error) from error


@router.post("/call-tool")
async def post_call_tool(body: CallToolRequest) -> dict[str, Any]:
    if body.name == "get_task" and body.task_id is None:
        raise HTTPException(422, "get_task cần task_id")
    arguments: dict[str, Any] = {} if body.name == "list_tasks" else {"task_id": body.task_id}
    try:
        result = await mcp_client.call_tool(body.name, arguments)
    except Exception as error:
        raise _mcp_error(error) from error
    # Kèm dữ liệu đọc trực tiếp từ SQLite để người xem đối chiếu với kết quả qua MCP.
    result["db_tasks"] = task_store.list_tasks(DEMO_SCOPE)
    return result


@router.post("/resources-prompts")
async def post_resources_prompts(body: PromptRequest) -> dict[str, Any]:
    try:
        return await mcp_client.resources_and_prompts(body.goal)
    except Exception as error:
        raise _mcp_error(error) from error


@router.get("/tasks")
async def get_tasks() -> dict[str, Any]:
    return {"scope": DEMO_SCOPE, "tasks": task_store.list_tasks(DEMO_SCOPE)}


@router.post("/seed")
async def post_seed() -> dict[str, Any]:
    created = [task_store.create_task(DEMO_SCOPE, title, priority)
               for title, priority in SEED_TASKS]
    return {"scope": DEMO_SCOPE, "seeded": len(created),
            "tasks": task_store.list_tasks(DEMO_SCOPE)}


@router.delete("/tasks")
async def reset_tasks(confirm: bool = False) -> dict[str, Any]:
    if not confirm:
        raise HTTPException(400, "Thiếu ?confirm=true để xóa dữ liệu demo")
    deleted = task_store.reset_scope(DEMO_SCOPE)  # Chỉ scope mcp.
    return {"scope": DEMO_SCOPE, "deleted": deleted, "tasks": task_store.list_tasks(DEMO_SCOPE)}
