"""Run thật qua ClaudeSDKClient + Claude Code CLI (gọi Anthropic từ Bun)."""

import asyncio
from typing import Any

from claude_agent_sdk import (
    AssistantMessage, ClaudeSDKClient, ResultMessage, StreamEvent, SystemMessage,
    TextBlock, ThinkingBlock, ToolResultBlock, ToolUseBlock, UserMessage,
)

from shared.sessions import Session

INFO_KEYS = ("claude_code_version", "pid", "current_permission_mode", "output_style")


def _blocks(message: AssistantMessage | UserMessage, log) -> None:
    if isinstance(message, AssistantMessage) and message.error:
        text = " ".join(b.text for b in message.content if isinstance(b, TextBlock))
        log("api_error", error=message.error, message=text[:500])
        return
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


def _stream_delta(message: StreamEvent, log) -> None:
    event = message.event
    if event.get("type") != "content_block_delta":
        return
    delta = event.get("delta", {})
    if delta.get("type") != "text_delta":
        return
    text = delta.get("text", "")
    if text:
        log("text_delta", text=text)


async def _interrupt_when(cancel_event: asyncio.Event, client: ClaudeSDKClient) -> None:
    await cancel_event.wait()
    await client.interrupt()


async def run_via_cli(
    options: Any, prompt: str, session: Session, log, cancel_event: asyncio.Event
) -> None:
    async with ClaudeSDKClient(options=options) as client:
        watcher = asyncio.create_task(_interrupt_when(cancel_event, client))
        try:
            info = await client.get_server_info() or {}
            agents = [agent.get("name") for agent in info.get("agents", [])]
            log("sdk_connected", **{key: info.get(key) for key in INFO_KEYS},
                subagents_registered=[n for n in agents if n in (options.agents or {})],
                transport="claude_code_cli")
            await client.query(prompt)
            async for message in client.receive_response():
                if isinstance(message, StreamEvent):
                    _stream_delta(message, log)
                elif isinstance(message, SystemMessage):
                    data = message.data or {}
                    if message.subtype == "api_retry":
                        log("system", subtype="api_retry", attempt=data.get("attempt"),
                            max_retries=data.get("max_retries"),
                            error_status=data.get("error_status"), error=data.get("error"))
                    else:
                        log("system", subtype=message.subtype)
                elif isinstance(message, (AssistantMessage, UserMessage)):
                    _blocks(message, log)
                elif isinstance(message, ResultMessage):
                    session.sdk_session_id = message.session_id
                    log("result", is_error=message.is_error, num_turns=message.num_turns,
                        duration_ms=message.duration_ms, total_cost_usd=message.total_cost_usd,
                        usage=message.usage, text=str(message.result)[:2000],
                        session_id=message.session_id)
                    if message.is_error:
                        log("error", kind="sdk_api_error", message=str(message.result)[:500])
                    return
                else:
                    log("sdk_message", kind=type(message).__name__,
                        subtype=getattr(message, "subtype", None))
        finally:
            watcher.cancel()