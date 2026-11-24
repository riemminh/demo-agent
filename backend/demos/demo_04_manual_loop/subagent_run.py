"""Hậu xử lý scenario Subagents: merge requirements, gỡ tool sau read/delegate."""

import json
from typing import Any, Callable

from .scenarios import RunProfile

Log = Callable[..., None]

_DELEGATE_ORDER = ("requirements-analyst", "task-planner")


def _shrink_delegate_schema(tool_schemas: list[dict[str, Any]], active: RunProfile) -> None:
    remaining = [name for name in _DELEGATE_ORDER if name not in active.delegated_agents]
    if not remaining:
        return
    for schema in tool_schemas:
        if schema.get("name") != "delegate_task":
            continue
        props = schema.get("input_schema", {}).get("properties", {})
        agent_prop = props.get("agent")
        if isinstance(agent_prop, dict):
            agent_prop["enum"] = remaining


def _merge_requirements(active: RunProfile, content: str, log: Log) -> None:
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        return
    if data.get("path") != "requirements.md":
        return
    text = str(data.get("text", "")).strip()
    if not text or active.requirements_in_system:
        return
    active.system = (active.system or "") + f"\n\n[requirements.md]\n{text}"
    active.requirements_in_system = True
    log("requirements_merged_into_system", chars=len(text))


def adjust_subagent_tools_after_batch(
    active: RunProfile,
    tool_blocks: list,
    results: list[dict[str, Any]],
    tool_schemas: list[dict[str, Any]],
    log: Log,
) -> list[dict[str, Any]]:
    if active.scenario != "subagents":
        return tool_schemas
    names = {b.name for b in tool_blocks}
    if "read_file" in names:
        for result in results:
            if not result.get("is_error"):
                _merge_requirements(active, str(result.get("content", "")), log)
        tool_schemas = [s for s in tool_schemas if s.get("name") != "read_file"]
        log("subagent_read_removed", path="requirements.md")
    if "delegate_task" in names:
        _shrink_delegate_schema(tool_schemas, active)
        if len(active.delegated_agents) >= len(_DELEGATE_ORDER):
            tool_schemas = []
            log("subagent_tools_cleared", reason="đã delegate đủ 2 subagent; chỉ end_turn")
        elif active.delegated_agents:
            log("subagent_delegate_narrowed", remaining=[
                n for n in _DELEGATE_ORDER if n not in active.delegated_agents
            ])
    return tool_schemas