"""Manual Agent Loop: Python điều khiển vòng lặp, model quyết định còn gọi tool hay đã xong.

working_messages là bản copy của history đã commit. Chỉ khi run kết thúc hợp lệ
(stop_reason=end_turn và có text) thì mới gán lại vào session.history.
Hết MAX_TURNS mà chưa xong thì max_turns_reached, không tự nói đã xong.
"""

import copy
import time
from collections.abc import Callable
from typing import Any

import anthropic

import config
import llm_limits
from shared.claude import answer_text, api_error, config_error, create_message, elapsed_ms, new_client
from shared.sessions import Session

from .loop_turns import run_tool_batch
from .scenarios import RunProfile
from .skill_run import adjust_tools_after_batch
from .subagent_run import adjust_subagent_tools_after_batch
from .structured_finish import structured_end_turn_action
from .tasks_tools import Approver

Event = dict[str, Any]
EventSink = Callable[[Event], None]
MAX_TURNS_LIMIT = 6


async def run_loop(
    session: Session,
    prompt: str,
    max_turns: int,
    emit: EventSink,
    approver: Approver,
    *,
    profile: RunProfile | None = None,
    structured_finish: bool = False,
) -> None:
    started = time.perf_counter()

    def log(event_type: str, **payload: Any) -> None:
        emit({"type": event_type, "at_ms": elapsed_ms(started), **payload})

    # Copy sâu: nếu run này fail/cancel thì history đã commit không bị bẩn.
    working: list[dict[str, Any]] = copy.deepcopy(session.history)
    active = profile or RunProfile(
        scenario="normal", system=None, tools=[], permitted=frozenset(),
        enforce_permissions=False, allow_delegate=False, structured_finish=structured_finish,
    )
    structured_finish = structured_finish or active.structured_finish
    tool_schemas = active.tools
    # Structured: không gửi history cũ khi finish theo schema.
    max_hist = 0 if structured_finish else llm_limits.MAX_HISTORY_MESSAGES
    if len(working) > max_hist:
        dropped = len(working) - max_hist
        working = working[-max_hist:]
        log("history_truncated", dropped=dropped, kept=len(working))
    working.append({"role": "user", "content": prompt})
    created_ids: list[int] = []
    usage = {"input_tokens": 0, "output_tokens": 0}
    if config.missing_llm_settings():
        log("error", **config_error(), created_ids=[])
        return

    log("run_started", max_turns=max_turns, history_before=len(session.history),
        scenario=active.scenario)
    if active.system:
        log("system_prompt_sent", chars=len(active.system), preview=active.system[:500])

    async with new_client() as client:
        for turn in range(1, max_turns + 1):
            log("request_sent", turn=turn, messages_in_request=len(working))
            try:
                response = await create_message(
                    client, messages=working, tools=tool_schemas, system=active.system,
                )
            except anthropic.APIError as error:
                log("error", **api_error(error), created_ids=created_ids)
                return
            usage["input_tokens"] += response.usage.input_tokens
            usage["output_tokens"] += response.usage.output_tokens
            log("response_received", turn=turn, stop_reason=response.stop_reason,
                blocks=[block.type for block in response.content], usage=dict(usage))

            if response.stop_reason == "tool_use":
                working.append({
                    "role": "assistant",
                    "content": [block.model_dump(exclude_none=True) for block in response.content],
                })
                tool_blocks = [b for b in response.content if b.type == "tool_use"]
                results, new_ids = await run_tool_batch(
                    tool_blocks, turn, approver, log,
                    enforce_permissions=active.enforce_permissions,
                    permitted=active.permitted,
                    allow_delegate=active.allow_delegate,
                    loaded_skills=active.loaded_skills,
                    skill_load_enabled=active.skill_load_enabled,
                    delegated_agents=active.delegated_agents,
                )
                created_ids.extend(new_ids)
                tool_schemas = adjust_tools_after_batch(active, tool_blocks, tool_schemas, log)
                tool_schemas = adjust_subagent_tools_after_batch(
                    active, tool_blocks, results, tool_schemas, log,
                )
                working.append({"role": "user", "content": results})
                continue

            if response.stop_reason == "end_turn":
                answer = answer_text(response).strip()
                if not answer:
                    log("error", kind="empty_final", message="end_turn nhưng không có block text.",
                        created_ids=created_ids)
                    return
                commit_answer = answer
                if structured_finish:
                    action = structured_end_turn_action(answer, turn=turn, max_turns=max_turns)
                    checked = action["checked"]
                    log("structured_validate", accepted=checked["accepted"],
                        schema_errors=checked.get("schema_errors", []),
                        semantic_errors=checked.get("semantic_errors", []))
                    if action["action"] == "repair":
                        log("structured_repair_requested", turn=turn,
                            schema_errors=checked.get("schema_errors", []),
                            semantic_errors=checked.get("semantic_errors", []))
                        working.append({"role": "assistant", "content": answer})
                        working.append({"role": "user", "content": action["user_content"]})
                        continue
                    if action["action"] == "fail":
                        log("error", kind="structured_invalid",
                            message="Câu trả lời cuối không pass TaskDraft (schema/semantic).",
                            created_ids=created_ids)
                        return
                    commit_answer = action["answer"]
                working.append({"role": "assistant", "content": commit_answer})
                session.history = working
                log("history_committed", history_after=len(session.history))
                log("final", answer=commit_answer, turns_used=turn, created_ids=created_ids,
                    usage=dict(usage))
                return

            log("error", kind="unexpected_stop_reason",
                message=f"stop_reason={response.stop_reason} không phải điều kiện dừng hợp lệ.",
                created_ids=created_ids)
            return

    log("max_turns_reached", max_turns=max_turns, created_ids=created_ids, usage=dict(usage),
        message=f"Hết {max_turns} lượt mà model chưa có câu trả lời cuối. History không commit.")
