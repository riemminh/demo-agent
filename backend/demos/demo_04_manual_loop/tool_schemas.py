"""Tool schema list theo tập tên — tránh import vòng giữa dispatch và subagent loop."""

from typing import Any

from .sandbox_io import READ_FILE_SCHEMA
from .skills import LOAD_SKILL_SCHEMA
from .subagents import DELEGATE_TASK_SCHEMA
from .tasks_tools import TOOL_SCHEMAS as TASK_TOOL_SCHEMAS


def build_tool_schemas(extra_names: frozenset[str] | None = None) -> list[dict[str, Any]]:
    names = extra_names or frozenset()
    # Chỉ gửi schema tool thật sự có trong scenario — giảm body (mạng ~1.4KB).
    schemas = [tool for tool in TASK_TOOL_SCHEMAS if tool["name"] in names]
    if "load_skill" in names:
        schemas.append(LOAD_SKILL_SCHEMA)
    if "read_file" in names:
        schemas.append(READ_FILE_SCHEMA)
    if "delegate_task" in names:
        schemas.append(DELEGATE_TASK_SCHEMA)
    return schemas


def schemas_for_scenario(
    *,
    with_skill: bool,
    with_read: bool,
    with_delegate: bool,
    task_tools: frozenset[str],
) -> list[dict[str, Any]]:
    names = set(task_tools)
    if with_skill:
        names.add("load_skill")
    if with_read:
        names.add("read_file")
    if with_delegate:
        names.add("delegate_task")
    return build_tool_schemas(frozenset(names))