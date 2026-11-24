"""Gọi messages.create; compact body khi mạng giới hạn payload."""

import anthropic
from anthropic import AsyncAnthropic
from anthropic.types import Message

import config
import llm_limits

from .message_compact import aggressive_compact, compact_loop_messages, estimate_body_bytes

def _create_kwargs(payload: list, tools: list, system: str | list[dict] | None) -> dict:
    kwargs = {
        "model": config.LLM_MODEL,
        "max_tokens": config.LLM_OUTPUT_MAX_TOKENS,
        "messages": payload,
        "tools": tools,
        "thinking": {"type": "disabled"},
    }
    if system:
        kwargs["system"] = system
    return kwargs


def _should_compact(
    messages: list, tools: list, system: str | list[dict] | None,
) -> bool:
    if len(messages) > llm_limits.COMPACT_LOOP_AFTER_MESSAGES:
        return True
    return estimate_body_bytes(
        model=config.LLM_MODEL,
        max_tokens=config.LLM_OUTPUT_MAX_TOKENS,
        messages=messages,
        tools=tools,
        system=system,
    ) > llm_limits.NETWORK_BODY_WARN_BYTES


def _payload_for_request(
    messages: list, tools: list, system: str | list[dict] | None,
) -> tuple[list, bool]:
    if not _should_compact(messages, tools, system):
        return messages, False
    compacted = compact_loop_messages(messages)
    est = estimate_body_bytes(
        model=config.LLM_MODEL,
        max_tokens=config.LLM_OUTPUT_MAX_TOKENS,
        messages=compacted,
        tools=tools,
        system=system,
    )
    if est > llm_limits.NETWORK_BODY_WARN_BYTES:
        return aggressive_compact(messages), True
    return compacted, True


async def create_with_compact(
    client: AsyncAnthropic,
    *,
    messages: list,
    tools: list,
    system: str | list[dict] | None = None,
) -> tuple[Message, bool]:
    payload, used_compact = _payload_for_request(messages, tools, system)
    try:
        return await client.messages.create(**_create_kwargs(payload, tools, system)), used_compact
    except anthropic.APIConnectionError:
        for builder in (compact_loop_messages, aggressive_compact):
            try:
                retry = builder(messages)
                return await client.messages.create(**_create_kwargs(retry, tools, system)), True
            except anthropic.APIConnectionError:
                continue
        raise