"""Subagent khai báo tĩnh + delegate_task (không delegation đệ quy)."""

from dataclasses import dataclass
from typing import Any

DELEGATE_TASK_SCHEMA: dict[str, Any] = {
    "name": "delegate_task",
    "description": "Delegate to requirements-analyst or task-planner.",
    "input_schema": {
        "type": "object",
        "properties": {
            "agent": {"type": "string", "enum": ["requirements-analyst", "task-planner"]},
            "instruction": {"type": "string"},
        },
        "required": ["agent", "instruction"],
    },
}

SUBAGENT_MAX_TURNS = 3


@dataclass(frozen=True)
class SubagentSpec:
    name: str
    system: str
    tools: frozenset[str]


SUBAGENTS: dict[str, SubagentSpec] = {
    "requirements-analyst": SubagentSpec(
        name="requirements-analyst",
        system=(
            "Bạn phân tích yêu cầu. Trả về tối đa 3 gạch đầu dòng, không viết code. "
            "Trả lời bằng tiếng Việt, ngắn gọn."
        ),
        tools=frozenset({"read_file", "list_tasks"}),
    ),
    "task-planner": SubagentSpec(
        name="task-planner",
        system=(
            "Bạn lập kế hoạch. Trả về tối đa 3 task dạng 'title — priority'. "
            "Priority: low | medium | high. Không viết code."
        ),
        tools=frozenset({"list_tasks"}),
    ),
}


def subagent_catalog() -> list[dict[str, str]]:
    return [
        {"name": spec.name, "description": spec.system[:120]}
        for spec in SUBAGENTS.values()
    ]