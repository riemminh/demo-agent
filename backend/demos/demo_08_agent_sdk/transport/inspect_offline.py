"""Inspect không spawn CLI — khi prefer_messages_over_cli (Inspect vẫn cần khi tắt fallback)."""

import time
from typing import Any

from ..customization import SANDBOX_DIR, SCENARIOS, build_options, scenario_allowlist


async def inspect_without_cli(scenario: str) -> dict[str, Any]:
    started = time.perf_counter()

    async def deny(_tool: str, _inp: dict[str, object]) -> bool:
        return False

    def noop_emit(_event: dict[str, object]) -> None:
        pass

    options = build_options(scenario, noop_emit, deny)
    declared = sorted((options.agents or {}).keys())
    return {
        "scenario": scenario,
        "connect_ms": round((time.perf_counter() - started) * 1000, 1),
        "cli_version": "messages-fallback (no CLI spawn)",
        "pid": None,
        "permission_mode": "fallback",
        "allowed_tools": scenario_allowlist(scenario),
        "skills": SCENARIOS[scenario]["skills"],
        "subagents_declared": declared,
        "subagents_registered": [],
        "cwd": str(SANDBOX_DIR),
        "transport": "python_messages_api",
    }