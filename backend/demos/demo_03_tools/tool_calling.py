"""Một tool round: Claude #1 → tool_use → Python thực thi → tool_result → Claude #2.

Chưa có loop nhiều iteration (Demo 04 mới dạy). Nếu model không xin gọi tool thì
báo đúng thực tế đó, không dựng tool_use giả.
"""

import time
from typing import Any

import anthropic
from anthropic.types import Message

import config
from shared.claude import (
    answer_text, api_error, config_error, elapsed_ms, new_client, usage_totals,
)

from .registry import TOOL_REGISTRY, execute
from .tools import schemas_for


def _result(status: str, events: list[dict[str, Any]], requests: list[dict[str, Any]],
            responses: list[Message], api_calls: int, started: float | None,
            answer: str | None = None, tool_calls: list[dict[str, Any]] | None = None,
            error: dict[str, Any] | None = None) -> dict[str, Any]:
    usage = usage_totals(responses)
    return {
        "status": status, "events": events, "requests": requests,
        "responses": [response.to_dict() for response in responses],
        "answer": answer, "tool_calls": tool_calls or [], "error": error,
        "metrics": {"api_calls": api_calls,
                    "latency_ms": elapsed_ms(started) if started else None, **usage},
    }


async def run_tool_round(
    prompt: str, tool_names: list[str], forced_tool: str | None, max_tokens: int
) -> dict[str, Any]:
    if config.missing_llm_settings():
        return _result("failed", [], [], [], 0, None, error=config_error())

    tools = schemas_for(tool_names)
    messages: list[dict[str, Any]] = [{"role": "user", "content": prompt}]
    events: list[dict[str, Any]] = []
    started = time.perf_counter()

    def log(event_type: str, **payload: Any) -> None:
        # at_ms do backend đo, tính từ lúc nhận request.
        events.append({"type": event_type, "at_ms": elapsed_ms(started), **payload})

    request_1: dict[str, Any] = {
        "model": config.LLM_MODEL, "max_tokens": max_tokens, "messages": messages,
        "tools": tools, "thinking": {"type": "disabled"},
    }
    if forced_tool:
        # Ép tool để minh họa protocol; scenario Registry để auto cho model tự chọn.
        request_1["tool_choice"] = {"type": "tool", "name": forced_tool}
    log("request_sent", call=1, tools=[tool["name"] for tool in tools],
        tool_choice=request_1.get("tool_choice", {"type": "auto"}))

    async with new_client() as client:
        try:
            first = await client.messages.create(**request_1)
        except anthropic.APIError as error:
            return _result("failed", events, [request_1], [], 1, started, error=api_error(error))
        log("response_received", call=1, stop_reason=first.stop_reason,
            blocks=[block.type for block in first.content])

        tool_uses = [block for block in first.content if block.type == "tool_use"]
        if not tool_uses:
            log("no_tool_use", message="Claude trả text luôn, không yêu cầu tool nào.")
            return _result("succeeded", events, [request_1], [first], 1, started,
                           answer=answer_text(first))

        tool_calls, result_blocks = [], []
        for block in tool_uses:  # Xử lý MỌI tool_use block, không bỏ sót block nào.
            tool_input = block.input if isinstance(block.input, dict) else {}
            log("tool_use", id=block.id, name=block.name, input=tool_input)
            log("registry_lookup", name=block.name, found=block.name in TOOL_REGISTRY)
            result = execute(block.name, tool_input)  # <-- Python thực thi, không phải model.
            log("tool_executed", name=block.name, is_error=result["is_error"],
                content=result["content"])
            tool_calls.append({"id": block.id, "name": block.name,
                               "input": tool_input, "result": result})
            # tool_use_id phải khớp đúng block đã nhận, và tool_result đi với role=user.
            result_blocks.append({"type": "tool_result", "tool_use_id": block.id,
                                  "content": result["content"], "is_error": result["is_error"]})

        request_2 = {
            **request_1,
            "messages": [
                *messages,
                {"role": "assistant",
                 "content": [block.model_dump(exclude_none=True) for block in first.content]},
                {"role": "user", "content": result_blocks},
            ],
        }
        request_2.pop("tool_choice", None)  # Không ép nữa, nếu không model sẽ gọi tool lần hai.
        log("tool_result_sent", tool_use_ids=[block["tool_use_id"] for block in result_blocks])
        log("request_sent", call=2, tools=[tool["name"] for tool in tools],
            tool_choice={"type": "auto"})
        try:
            second = await client.messages.create(**request_2)
        except anthropic.APIError as error:
            return _result("failed", events, [request_1, request_2], [first], 2, started,
                           tool_calls=tool_calls, error=api_error(error))
        log("response_received", call=2, stop_reason=second.stop_reason,
            blocks=[block.type for block in second.content])
        answer = answer_text(second)
        log("final", answer=answer)
        return _result("succeeded", events, [request_1, request_2], [first, second], 2, started,
                       answer=answer, tool_calls=tool_calls)
