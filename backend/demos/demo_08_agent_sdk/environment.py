"""Prerequisites của Demo 08: SDK, Claude Code CLI, API key, cap và sandbox.

Plan yêu cầu ghi rõ environment prerequisites và báo thiếu thay vì fail mờ mịt.
UI đọc hàm này để hiện trạng thái trước khi cho bấm Run.
"""

import importlib.metadata as metadata
import shutil
from typing import Any

import config
from shared.approval import APPROVAL_TIMEOUT_SECONDS

from .customization import MAX_BUDGET_USD, MAX_TURNS, SANDBOX_DIR, SCENARIOS


def env_summary() -> dict[str, Any]:
    cli_path = shutil.which("claude")
    return {
        "sdk_version": metadata.version("claude-agent-sdk"),
        "cli_found": bool(cli_path),
        "cli_path": cli_path,
        "api_key_configured": bool(config.ANTHROPIC_API_KEY),
        "model": config.LLM_MODEL or None,
        "sandbox_dir": str(SANDBOX_DIR),
        "max_turns": MAX_TURNS,
        "max_budget_usd": MAX_BUDGET_USD,
        "run_timeout_seconds": float(config.SDK_RUN_TIMEOUT_SECONDS),
        "approval_timeout_seconds": APPROVAL_TIMEOUT_SECONDS,
        "scenarios": {
            key: {"label": value["label"], "prompt": value["prompt"], "tools": value["tools"],
                  "skills": value["skills"], "subagents": value["agents"]}
            for key, value in SCENARIOS.items()
        },
    }