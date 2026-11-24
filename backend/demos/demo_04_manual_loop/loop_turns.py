"""Xử lý một lượt tool_use trong manual loop (tách khỏi agent_loop để giữ file ≤150 dòng)."""

from collections.abc import Callable
from typing import Any

from .tool_dispatch import dispatch_tool
from .tasks_tools import Approver

LogSink = Callable[..., None]


async def run_tool_batch(
    blocks: list,
    turn: int,
    approver: Approver,
    log: LogSink,
    *,
    enforce_permissions: bool,
    permitted: frozenset[str],
    allow_delegate: bool,
    loaded_skills: set[str] | None = None,
    skill_load_enabled: bool = True,
    delegated_agents: set[str] | None = None,
) -> tuple[list[dict[str, Any]], list[int]]:
    def dict_sink(event: dict[str, Any]) -> None:
        payload = dict(event)
        kind = str(payload.pop("type"))
        log(kind, **payload)

    results: list[dict[str, Any]] = []
    created_ids: list[int] = []
    for block in blocks:
        tool_input = block.input if isinstance(block.input, dict) else {}
        log("tool_use", turn=turn, id=block.id, name=block.name, input=tool_input)
        result = await dispatch_tool(
            block.name, tool_input, approver, dict_sink, turn,
            enforce_permissions=enforce_permissions,
            permitted=permitted,
            allow_delegate=allow_delegate,
            loaded_skills=loaded_skills,
            skill_load_enabled=skill_load_enabled,
            delegated_agents=delegated_agents,
        )
        if "created_id" in result:
            created_ids.append(int(result["created_id"]))
        log("tool_result", turn=turn, name=block.name,
            is_error=result["is_error"], content=result["content"])
        results.append({"type": "tool_result", "tool_use_id": block.id,
                        "content": result["content"], "is_error": result["is_error"]})
    return results, created_ids