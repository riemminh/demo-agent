"""Chạy một query bằng Claude Agent SDK và dịch SDK message thành event cho UI.

Khác Demo 04: ở đó mình tự viết vòng lặp. Ở đây SDK (qua Claude Code CLI) giữ vòng lặp;
code này chỉ cấp options, nhận message và quyết định cho phép tool hay không.
Không bọc thêm loop nào lên trên SDK.
"""

import asyncio
import time
from collections.abc import Awaitable, Callable
from typing import Any

from claude_agent_sdk import (
    AssistantMessage, ClaudeSDKClient, ResultMessage, SystemMessage,
    TextBlock, ThinkingBlock, ToolResultBlock, ToolUseBlock, UserMessage,
)

import config
from shared.sessions import Session

from .customization import MAX_BUDGET_USD, MAX_TURNS, SCENARIOS, build_options

Event = dict[str, Any]
Emit = Callable[[Event], None]
Approver = Callable[[str, dict[str, Any]], Awaitable[bool]]
RUN_TIMEOUT_SECONDS = 45.0

# Field của get_server_info() mà demo dùng làm bằng chứng options đã tới CLI.
INFO_KEYS = ("claude_code_version", "pid", "current_permission_mode", "output_style")


def _blocks(message: AssistantMessage | UserMessage, emit: Emit, log: Callable[..., None]) -> None:
    for block in message.content if isinstance(message.content, list) else []:
        if isinstance(block, TextBlock):
            log("assistant_text", text=block.text)
        elif isinstance(block, ThinkingBlock):
            log("assistant_thinking", chars=len(block.thinking))
        elif isinstance(block, ToolUseBlock):
            log("tool_use", tool=block.name, input=block.input, id=block.id)
        elif isinstance(block, ToolResultBlock):
            log("tool_result", tool_use_id=block.tool_use_id,
                is_error=bool(block.is_error), content=str(block.content)[:400])


async def run_turn(
    session: Session, scenario: str, prompt: str, queue: asyncio.Queue[Event]
) -> None:
    """Chạy một run SDK trong Task riêng, đẩy event vào Queue cho SSE đọc."""

    def emit(event: Event) -> None:
        queue.put_nowait(event)

    async def approver(tool_name: str, tool_input: dict[str, Any]) -> bool:
        return await session.approvals.request(tool_name, tool_input, emit)

    try:
        if not config.ANTHROPIC_API_KEY:
            emit({"type": "error", "kind": "config_missing",
                  "message": "Thiếu ANTHROPIC_API_KEY trong backend/.env"})
            return
        # CLI tự retry lỗi mạng với backoff; không có cận trên thì một run kéo dài vài phút.
        await asyncio.wait_for(run_query(scenario, prompt, emit, approver), RUN_TIMEOUT_SECONDS)
    except TimeoutError:
        emit({"type": "error", "kind": "timeout",
              "message": f"Hủy run sau {RUN_TIMEOUT_SECONDS:.0f}s. Nếu event trước đó là "
                         "system(api_retry) thì CLI đang retry lỗi mạng — xem Known limitation "
                         "trong README."})
    except asyncio.CancelledError:
        emit({"type": "error", "kind": "cancelled", "message": "Run bị cancel; SDK session đã đóng."})
    except Exception as error:  # Lỗi SDK/CLI: báo kind + message, không trả traceback.
        emit({"type": "error", "kind": type(error).__name__, "message": str(error)[:500]})
    finally:
        session.approvals.deny_all_pending()
        emit({"type": "run_finished"})


async def inspect_session(scenario: str) -> dict[str, Any]:
    """Spawn CLI, initialize rồi đọc metadata session — KHÔNG gọi model, nên chỉ vài giây.

    Dùng để chứng minh options (tool, skill, subagent) đã tới CLI thật mà không tốn
    một lượt model, và vẫn xem được gì khi đường ra api.anthropic.com bị chặn.
    """
    started = time.perf_counter()
    collected: list[Event] = []

    async def deny_all(tool_name: str, tool_input: dict[str, Any]) -> bool:
        return False  # Inspect không chạy tool nên callback này không được gọi.

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
    }


async def run_query(scenario: str, prompt: str, emit: Emit, approver: Approver) -> None:
    started = time.perf_counter()

    def log(event_type: str, **payload: Any) -> None:
        emit({"type": event_type, "at_ms": round((time.perf_counter() - started) * 1000, 1),
              **payload})

    def emit_with_time(event: Event) -> None:
        # Event từ permission callback / hook: thêm mốc thời gian rồi đẩy ra cùng một stream.
        log(str(event["type"]), **{key: value for key, value in event.items() if key != "type"})

    options = build_options(scenario, emit_with_time, approver)
    config = SCENARIOS[scenario]
    log("options_built", tools=list(options.allowed_tools or []),
        skills=config["skills"], subagents=list((options.agents or {}).keys()),
        max_turns=MAX_TURNS, max_budget_usd=MAX_BUDGET_USD, cwd=str(options.cwd))

    async with ClaudeSDKClient(options=options) as client:
        info = await client.get_server_info() or {}
        agents = [agent.get("name") for agent in info.get("agents", [])]
        log("sdk_connected", **{key: info.get(key) for key in INFO_KEYS},
            subagents_registered=[name for name in agents if name in (options.agents or {})])
        await client.query(prompt)
        async for message in client.receive_response():
            if isinstance(message, SystemMessage):
                # api_retry, init, compact_boundary... giữ nguyên subtype thật của SDK.
                log("system", subtype=message.subtype)
            elif isinstance(message, (AssistantMessage, UserMessage)):
                _blocks(message, emit, log)
            elif isinstance(message, ResultMessage):
                log("result", is_error=message.is_error, num_turns=message.num_turns,
                    duration_ms=message.duration_ms, total_cost_usd=message.total_cost_usd,
                    usage=message.usage, text=str(message.result)[:2000])
            else:
                log("sdk_message", kind=type(message).__name__,
                    subtype=getattr(message, "subtype", None))
