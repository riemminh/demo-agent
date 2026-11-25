"""Env cho subprocess Claude Code CLI."""

import config


def cli_child_env() -> dict[str, str]:
    return {
        "ANTHROPIC_API_KEY": config.ANTHROPIC_API_KEY,
        "CLAUDE_AGENT_SDK_DISABLE_BUILTIN_AGENTS": "1",
        "CLAUDE_CODE_DISABLE_BACKGROUND_TASKS": "1",
        "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1",
        "CLAUDE_CODE_MAX_RETRIES": str(config.SDK_MAX_RETRIES),
    }