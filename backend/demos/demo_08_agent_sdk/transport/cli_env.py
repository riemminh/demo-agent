"""Env Claude Code CLI — proxy từ shared.llm_network + flag riêng Demo 08."""

import config
from shared.llm_network import copy_proxy_env


def cli_child_env() -> dict[str, str]:
    return {
        **copy_proxy_env(),
        "ANTHROPIC_API_KEY": config.ANTHROPIC_API_KEY,
        "CLAUDE_AGENT_SDK_DISABLE_BUILTIN_AGENTS": "1",
        "CLAUDE_CODE_DISABLE_BACKGROUND_TASKS": "1",
        "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1",
        "CLAUDE_CODE_MAX_RETRIES": str(config.SDK_MAX_RETRIES),
    }