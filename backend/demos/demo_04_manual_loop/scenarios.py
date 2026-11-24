"""Cấu hình scenario Demo 04 — legacy loop + Rules/Skills/Permissions/Subagents."""

from dataclasses import dataclass, field
from typing import Any, Literal

from .rules import BASE_SYSTEM, load_rules_bundle
from .skills import discover_skills, skills_system_append
from .subagents import subagent_catalog
from .tool_schemas import schemas_for_scenario

ScenarioName = Literal[
    "normal", "max-turns", "failure", "structured",
    "rules", "skills", "permissions", "subagents",
]

LEGACY: frozenset[ScenarioName] = frozenset({"normal", "max-turns", "failure", "structured"})


@dataclass
class RunProfile:
    scenario: ScenarioName
    system: str | None
    tools: list[dict[str, Any]]
    permitted: frozenset[str]
    enforce_permissions: bool
    allow_delegate: bool
    structured_finish: bool
    loaded_skills: set[str] = field(default_factory=set)
    merged_skill_names: set[str] = field(default_factory=set)
    skill_load_enabled: bool = True
    requirements_in_system: bool = False
    delegated_agents: set[str] = field(default_factory=set)


SCENARIO_META: dict[ScenarioName, dict[str, Any]] = {
    "rules": {
        "default_prompt": (
            "Theo rules đã nạp, tóm tắt chính sách tạo task (3 ý). "
            "Gọi list_tasks nếu cần ví dụ trạng thái hiện tại."
        ),
        "max_turns": 4,
    },
    "skills": {
        "default_prompt": "Lập kế hoạch cho việc thêm 2FA vào trang đăng nhập.",
        "max_turns": 5,
    },
    "permissions": {
        "default_prompt": (
            'Kiểm tra danh sách task. Nếu chưa có task "Login", hãy tạo task "Login" priority high. '
            "Trả lời ngắn khi xong."
        ),
        "max_turns": 4,
    },
    "subagents": {
        "default_prompt": "Phân tích yêu cầu trong requirements.md rồi lập kế hoạch ngắn.",
        "max_turns": 5,
    },
}


def prepare_scenario(scenario: ScenarioName, emit) -> RunProfile:
    structured = scenario == "structured"
    if scenario in LEGACY:
        return RunProfile(
            scenario=scenario,
            system=None,
            tools=schemas_for_scenario(
                with_skill=False, with_read=False, with_delegate=False,
                task_tools=frozenset({"list_tasks", "create_task", "get_task"}),
            ),
            permitted=frozenset({"list_tasks", "create_task", "get_task"}),
            enforce_permissions=False,
            allow_delegate=False,
            structured_finish=structured,
        )

    if scenario == "rules":
        bundle = load_rules_bundle()
        emit({"type": "rules_loaded", "loaded_files": bundle["loaded_files"],
              "system_prompt": bundle["system_prompt"]})
        return RunProfile(
            scenario=scenario,
            system=str(bundle["system_prompt"]),
            tools=schemas_for_scenario(
                with_skill=False, with_read=False, with_delegate=False,
                task_tools=frozenset({"list_tasks"}),
            ),
            permitted=frozenset({"list_tasks"}),
            enforce_permissions=False,
            allow_delegate=False,
            structured_finish=False,
        )

    if scenario == "skills":
        skills = discover_skills()
        emit({"type": "skills_discovered", "skills": skills})
        system = BASE_SYSTEM + skills_system_append(skills)
        return RunProfile(
            scenario=scenario,
            system=system,
            tools=schemas_for_scenario(
                with_skill=True, with_read=False, with_delegate=False,
                task_tools=frozenset({"list_tasks"}),
            ),
            permitted=frozenset({"list_tasks", "load_skill"}),
            enforce_permissions=False,
            allow_delegate=False,
            structured_finish=False,
        )

    if scenario == "permissions":
        return RunProfile(
            scenario=scenario,
            system=BASE_SYSTEM,
            tools=schemas_for_scenario(
                with_skill=False, with_read=False, with_delegate=False,
                task_tools=frozenset({"list_tasks", "create_task", "get_task"}),
            ),
            permitted=frozenset({"list_tasks", "create_task", "get_task"}),
            enforce_permissions=True,
            allow_delegate=False,
            structured_finish=False,
        )

    # subagents
    emit({"type": "subagents_registered", "agents": subagent_catalog()})
    return RunProfile(
        scenario=scenario,
        system=BASE_SYSTEM + (
            "\n\nSubagents: requirements-analyst, task-planner (delegate_task)."
            "\nQuy trình: read_file requirements.md một lần → delegate analyst → delegate planner"
            " → tóm tắt bằng text. Không đọc file lại."
        ),
        tools=schemas_for_scenario(
            with_skill=False, with_read=True, with_delegate=True,
            task_tools=frozenset(),
        ),
        permitted=frozenset({"read_file", "delegate_task"}),
        enforce_permissions=False,
        allow_delegate=True,
        structured_finish=False,
    )