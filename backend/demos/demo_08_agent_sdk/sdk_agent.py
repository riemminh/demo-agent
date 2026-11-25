"""Claude Agent SDK: options, transport CLI, không bọc agent loop."""

import asyncio
import time
from collections.abc import Awaitable, Callable
from typing import Any

from claude_agent_sdk import ClaudeSDKClient

import config
from shared.claude import config_error
from shared.sessions import Session

from .customization import MAX_BUDGET_USD, MAX_TURNS, SCENARIOS, build_options
from .transport import run_via_cli

Event = dict[str, Any]
Emit = Callable[[Event], None]
Approver = Callable[[str, dict[str, Any]], Awaitable[bool]]


async def run_turn(
    session: Session, scenario: str, prompt: str, queue: asyncio.Queue[Event]
) -> None:
    def emit(event: Event) -> None:
        queue.put_nowait(event)

    async def approver(tool_name: str, tool_input: dict[str, Any]) -> bool:
        return await session.approvals.request(tool_name, tool_input, emit)

    timeout = float(config.SDK_RUN_TIMEOUT_SECONDS)
    session.cancel_event.clear()
    try:
        if config.missing_llm_settings():
            emit({"type": "error", "at_ms": 0, **config_error()})
            return
        await asyncio.wait_for(
            run_query(scenario, prompt, emit, approver, session), timeout,
        )
    except TimeoutError:
        emit({"type": "error", "kind": "timeout",
              "message": f"Hủy run sau {timeout:.0f}s."})
    except asyncio.CancelledError:
        emit({"type": "error", "kind": "cancelled", "message": "Run bị cancel; SDK session đã đóng."})
    except Exception as error:
        emit({"type": "error", "kind": type(error).__name__, "message": str(error)[:500]})
    finally:
        session.approvals.deny_all_pending()
        emit({"type": "run_finished"})


async def inspect_session(scenario: str) -> dict[str, Any]:
    started = time.perf_counter()
    collected: list[Event] = []

    async def deny_all(tool_name: str, tool_input: dict[str, Any]) -> bool:
        return False

    options = build_options(scenario, collected.append, deny_all)
    async with ClaudeSDKClient(options=options) as client:
        info = await client.get_server_info() or {}
    declared = sorted((options.agents or {}).keys())
    registered = [agent.get("name") for agent in info.get("agents", [])]
    return {
        "scenario": scenario,
        "connect_ms": round((time.perf_counter() - started) * 1000, 1),
        "cli_version": info.get("claude_code_version"),
        "pid": info.get("pid"),
        "permission_mode": info.get("current_permission_mode"),
        "allowed_tools": list(options.allowed_tools or []),
        "skills": SCENARIOS[scenario]["skills"],
        "subagents_declared": declared,
        "subagents_registered": [name for name in registered if name in declared],
        "cwd": str(options.cwd),
        "transport": "claude_code_cli",
    }


async def run_query(
    scenario: str, prompt: str, emit: Emit, approver: Approver, session: Session
) -> None:
    started = time.perf_counter()

    def log(event_type: str, **payload: Any) -> None:
        emit({"type": event_type, "at_ms": round((time.perf_counter() - started) * 1000, 1),
              **payload})

    def emit_with_time(event: Event) -> None:
        log(str(event["type"]), **{k: v for k, v in event.items() if k != "type"})

    options = build_options(scenario, emit_with_time, approver, resume=session.sdk_session_id)
    scen = SCENARIOS[scenario]
    log("options_built", tools=list(options.allowed_tools or []),
        skills=scen["skills"], subagents=list((options.agents or {}).keys()),
        max_turns=MAX_TURNS, max_budget_usd=MAX_BUDGET_USD, resume=session.sdk_session_id)

    await run_via_cli(options, prompt, session, log, session.cancel_event)