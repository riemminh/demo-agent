"""Vòng lặp Claude thu nhỏ cho subagent — context tách, không delegate lồng nhau."""

import json
import time
from collections.abc import Callable
from typing import Any

import anthropic

from shared.claude import answer_text, api_error, create_message, elapsed_ms, new_client

from .subagents import SUBAGENTS, SUBAGENT_MAX_TURNS, SubagentSpec
from .tool_dispatch import dispatch_tool
from .tool_schemas import build_tool_schemas

EventSink = Callable[[dict[str, Any]], None]


def _merge_read_into_system(system: str, content: str) -> str:
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        return system
    if data.get("path") != "requirements.md":
        return system
    text = str(data.get("text", "")).strip()
    if not text or "[requirements.md]" in system:
        return system
    return system + f"\n\n[requirements.md]\n{text}"


async def run_subagent(
    spec: SubagentSpec,
    instruction: str,
    emit: EventSink,
    approver: Any,
    *,
    enforce_permissions: bool,
    permitted: frozenset[str],
) -> str:
    started = time.perf_counter()

    def log(event_type: str, **payload: Any) -> None:
        emit({"type": event_type, "at_ms": elapsed_ms(started), "subagent": spec.name, **payload})

    system = spec.system
    schemas = build_tool_schemas(spec.tools)
    messages: list[dict[str, Any]] = [{"role": "user", "content": instruction}]
    log("subagent_started", max_turns=SUBAGENT_MAX_TURNS, tools=sorted(spec.tools))

    async with new_client() as client:
        for turn in range(1, SUBAGENT_MAX_TURNS + 1):
            try:
                response = await create_message(
                    client, messages=messages, tools=schemas, system=system,
                )
            except anthropic.APIError as error:
                err = api_error(error)
                log("subagent_error", **err)
                return f"Subagent lỗi: {err.get('message', 'unknown')}"

            if response.stop_reason == "tool_use":
                messages.append({
                    "role": "assistant",
                    "content": [block.model_dump(exclude_none=True) for block in response.content],
                })
                results = []
                for block in [b for b in response.content if b.type == "tool_use"]:
                    tool_input = block.input if isinstance(block.input, dict) else {}
                    log("tool_use", turn=turn, name=block.name, input=tool_input)
                    result = await dispatch_tool(
                        block.name, tool_input, approver, emit, turn,
                        enforce_permissions=False,
                        permitted=permitted & spec.tools,
                        allow_delegate=False,
                    )
                    log("tool_result", turn=turn, name=block.name,
                        is_error=result["is_error"], content=result["content"][:200])
                    results.append({"type": "tool_result", "tool_use_id": block.id,
                                    "content": result["content"], "is_error": result["is_error"]})
                    if block.name == "read_file" and not result["is_error"]:
                        system = _merge_read_into_system(system, result["content"])
                        schemas = [s for s in schemas if s.get("name") != "read_file"]
                    if block.name == "list_tasks":
                        schemas = []
                messages.append({"role": "user", "content": results})
                continue

            if response.stop_reason == "end_turn":
                answer = answer_text(response).strip()
                log("subagent_finished", turn=turn, answer_preview=answer[:200])
                return answer or "(subagent không có text)"

            log("subagent_error", kind="unexpected_stop", stop_reason=response.stop_reason)
            return f"Subagent dừng với stop_reason={response.stop_reason}"

    return "Subagent hết lượt mà chưa có câu trả lời."


async def execute_delegate(
    tool_input: dict[str, Any],
    emit: EventSink,
    approver: Any,
    permitted: frozenset[str],
    delegated_agents: set[str] | None = None,
) -> dict[str, Any]:
    agent = str(tool_input.get("agent", ""))
    instruction = str(tool_input.get("instruction", "")).strip()
    done = delegated_agents if delegated_agents is not None else set()
    if agent in done:
        return {
            "is_error": True,
            "content": (
                f"Subagent {agent} đã chạy. "
                f"Tiếp theo: delegate task-planner (nếu chưa) rồi trả lời text cuối."
            ),
        }
    spec = SUBAGENTS.get(agent)
    if spec is None:
        return {"is_error": True, "content": f"Unknown subagent: {agent}"}
    if not instruction:
        return {"is_error": True, "content": "instruction trống"}
    emit({"type": "delegation_started", "agent": agent, "instruction": instruction[:300]})
    text = await run_subagent(spec, instruction, emit, approver,
                              enforce_permissions=False, permitted=permitted)
    done.add(agent)
    emit({"type": "delegation_finished", "agent": agent, "result_preview": text[:300]})
    # tool_result ngắn cho main loop — bản đủ hơn được merge vào system ở subagent_run.
    clipped = text if len(text) <= 320 else text[:320] + "…"
    return {"is_error": False,
            "content": json.dumps({"agent": agent, "result": clipped}, ensure_ascii=False)}