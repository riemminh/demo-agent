"""Bốn chỗ ứng dụng vẫn kiểm soát SDK: permissions, hooks, skills, subagents.

- `can_use_tool`: SDK hỏi TRƯỚC khi chạy tool; Deny thì tool không bao giờ chạy.
- hooks: callback quan sát (UserPromptSubmit, PreToolUse) với payload thật của SDK.
- skills: file SKILL.md trong sandbox của demo, bật qua option `skills`.
- subagents: `AgentDefinition` khai báo agent con; SDK quyết định có delegate hay không.
"""

from collections.abc import Awaitable, Callable
from pathlib import Path
from typing import Any

from claude_agent_sdk import (
    AgentDefinition, ClaudeAgentOptions, HookMatcher,
    PermissionResultAllow, PermissionResultDeny, ToolPermissionContext,
)

import config

from .sdk_tools import ALL_TOOLS, CREATE_TOOL, LIST_TOOL, build_tool_server

Emit = Callable[[dict[str, Any]], None]
Approver = Callable[[str, dict[str, Any]], Awaitable[bool]]

SANDBOX_DIR = Path(__file__).parent / "sandbox"  # cwd của agent; chứa .claude/skills.
SKILL_NAME = "task-planning"
MAX_TURNS = 4
MAX_BUDGET_USD = 0.10

SCENARIOS: dict[str, dict[str, Any]] = {
    "basic": {
        "label": "Basic SDK Agent",
        "prompt": "Dùng tool list_tasks để xem có task nào chưa, rồi trả lời ngắn.",
        "tools": [LIST_TOOL],
        "skills": None,
        "agents": False,
    },
    "permissions": {
        "label": "Permissions & Hooks",
        "prompt": 'Kiểm tra danh sách task. Nếu chưa có task "Login", hãy tạo task "Login" priority high. Trả lời ngắn khi xong.',
        "tools": ALL_TOOLS,
        "skills": None,
        "agents": False,
    },
    "skills": {
        "label": "Skills",
        "prompt": "Lập kế hoạch cho việc thêm 2FA vào trang đăng nhập.",
        "tools": [LIST_TOOL],
        "skills": [SKILL_NAME],
        "agents": False,
    },
    "subagents": {
        "label": "Subagents",
        "prompt": "Phân tích yêu cầu trong requirements.md rồi lập kế hoạch ngắn.",
        "tools": [LIST_TOOL],
        "skills": None,
        "agents": True,
    },
}

SUBAGENTS = {
    "requirements-analyst": AgentDefinition(
        description="Đọc một yêu cầu và chỉ ra các điểm cần làm rõ. Dùng khi cần phân tích yêu cầu.",
        prompt="Bạn phân tích yêu cầu. Trả về tối đa 3 gạch đầu dòng, không viết code.",
        tools=[LIST_TOOL],
    ),
    "task-planner": AgentDefinition(
        description="Chia yêu cầu thành các task có priority. Dùng khi cần lập kế hoạch.",
        prompt="Bạn lập kế hoạch. Trả về tối đa 3 task dạng 'title — priority'.",
        tools=[LIST_TOOL],
    ),
}


def scenario_allowlist(scenario: str) -> list[str]:
    """Tool auto-approve qua allowed_tools sẽ KHÔNG gọi can_use_tool — chỉ đưa tool đọc."""
    config_ = SCENARIOS[scenario]
    allowed = [tool for tool in config_["tools"] if tool != CREATE_TOOL]
    if config_["skills"]:
        allowed.append("Skill")
    if config_["agents"]:
        allowed.append("Task")
    return allowed


def _scenario_tool_names(scenario: str) -> frozenset[str]:
    cfg = SCENARIOS[scenario]
    names = set(cfg["tools"])
    if cfg["skills"]:
        names.add("Skill")
    if cfg["agents"]:
        names.add("Task")
    return frozenset(names)


def permission_callback(
    emit: Emit, approver: Approver, allowed_tools: list[str], scenario: str,
) -> Any:
    """SDK gọi trước mỗi tool. Tool đọc: auto qua allowed_tools; ghi: luôn qua approver."""

    allowset = frozenset(allowed_tools)
    permitted = _scenario_tool_names(scenario)

    async def can_use_tool(
        tool_name: str, tool_input: dict[str, Any], context: ToolPermissionContext
    ) -> PermissionResultAllow | PermissionResultDeny:
        emit({"type": "permission_requested", "tool": tool_name, "input": tool_input})
        if tool_name not in permitted:
            emit({"type": "permission_decided", "tool": tool_name, "allowed": False,
                  "reason": "tool không thuộc scenario"})
            return PermissionResultDeny(message=f"Tool {tool_name} không được phép trong scenario này.")
        if tool_name != CREATE_TOOL:
            emit({"type": "permission_decided", "tool": tool_name, "allowed": True,
                  "reason": "trong allowlist, không ghi dữ liệu"})
            return PermissionResultAllow()
        approved = await approver(tool_name, tool_input)
        emit({"type": "permission_decided", "tool": tool_name, "allowed": approved,
              "reason": "người dùng quyết định cho tool ghi"})
        if approved:
            return PermissionResultAllow()
        return PermissionResultDeny(message="Người dùng từ chối ghi dữ liệu.")

    return can_use_tool


def hook_matchers(emit: Emit) -> dict[str, list[HookMatcher]]:
    """Hook quan sát: payload do SDK cung cấp, không phải mình tự dựng."""

    async def observe(input_data: dict[str, Any], tool_use_id: str | None, context: Any) -> dict:
        emit({"type": "hook_fired",
              "hook": input_data.get("hook_event_name"),
              "tool": input_data.get("tool_name"),
              "prompt": input_data.get("prompt"),
              "session_id": input_data.get("session_id")})
        return {}  # Không chặn gì: quyền chặn nằm ở can_use_tool.

    return {
        "UserPromptSubmit": [HookMatcher(hooks=[observe])],
        "PreToolUse": [HookMatcher(hooks=[observe])],
    }


def build_options(
    scenario: str, emit: Emit, approver: Approver, *, resume: str | None = None
) -> ClaudeAgentOptions:
    config_ = SCENARIOS[scenario]
    allowed = scenario_allowlist(scenario)
    extra_tools: list[str] = []
    if config_["skills"]:
        extra_tools.append("Skill")
    if config_["agents"]:
        extra_tools.append("Task")
    from .transport import cli_child_env

    return ClaudeAgentOptions(
        system_prompt="Bạn là trợ lý quản lý task. Trả lời ngắn gọn bằng tiếng Việt.",
        cwd=str(SANDBOX_DIR),
        # Tắt Bash/Read/Edit… — chỉ Skill, Task và MCP demo (giảm payload CLI).
        tools=extra_tools,
        setting_sources=[],
        mcp_servers={"tasks": build_tool_server()},
        allowed_tools=allowed,
        strict_mcp_config=True,
        can_use_tool=permission_callback(emit, approver, allowed, scenario),
        hooks=hook_matchers(emit),
        include_hook_events=True,
        include_partial_messages=True,
        skills=config_["skills"],
        agents=SUBAGENTS if config_["agents"] else None,
        max_turns=MAX_TURNS,
        max_budget_usd=MAX_BUDGET_USD,
        model=config.LLM_MODEL,
        resume=resume,
        env=cli_child_env(),
    )
