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
        "prompt": 'Tạo task "Login" với priority high.',
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


def permission_callback(emit: Emit, approver: Approver) -> Any:
    """SDK gọi hàm này trước mỗi tool call. Tool chỉ đọc thì cho qua; tool ghi thì hỏi người."""

    async def can_use_tool(
        tool_name: str, tool_input: dict[str, Any], context: ToolPermissionContext
    ) -> PermissionResultAllow | PermissionResultDeny:
        emit({"type": "permission_requested", "tool": tool_name, "input": tool_input})
        if tool_name != CREATE_TOOL:
            emit({"type": "permission_decided", "tool": tool_name, "allowed": True,
                  "reason": "tool chỉ đọc, tự động cho phép"})
            return PermissionResultAllow()
        approved = await approver(tool_name, tool_input)  # await Future -> chờ browser.
        emit({"type": "permission_decided", "tool": tool_name, "allowed": approved,
              "reason": "người dùng quyết định"})
        if approved:
            return PermissionResultAllow()
        # Deny thật: SDK sẽ không chạy tool, không có row nào vào SQLite.
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


def build_options(scenario: str, emit: Emit, approver: Approver) -> ClaudeAgentOptions:
    config_ = SCENARIOS[scenario]
    allowed = list(config_["tools"])
    if config_["skills"]:
        allowed.append("Skill")  # Skill là tool của CLI; không bật thì skill không chạy được.
    if config_["agents"]:
        allowed.append("Task")  # Task là tool để delegate cho subagent.
    return ClaudeAgentOptions(
        system_prompt="Bạn là trợ lý quản lý task. Trả lời ngắn gọn bằng tiếng Việt.",
        cwd=str(SANDBOX_DIR),
        setting_sources=[],  # KHÔNG nạp settings/plugin cá nhân của máy đang chạy.
        mcp_servers={"tasks": build_tool_server()},
        allowed_tools=allowed,
        can_use_tool=permission_callback(emit, approver),
        hooks=hook_matchers(emit),
        include_hook_events=True,
        skills=config_["skills"],
        agents=SUBAGENTS if config_["agents"] else None,
        max_turns=MAX_TURNS,          # Cận trên số lượt.
        max_budget_usd=MAX_BUDGET_USD,  # Cận trên chi phí.
        model=config.LLM_MODEL,
        env={"ANTHROPIC_API_KEY": config.ANTHROPIC_API_KEY},
    )
