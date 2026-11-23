"""Manual Agent Loop: Python điều khiển vòng lặp, model quyết định còn gọi tool hay đã xong.

working_messages là bản copy của history đã commit. Chỉ khi run kết thúc hợp lệ
(stop_reason=end_turn và có text) thì mới gán lại vào session.history.
Hết MAX_TURNS mà chưa xong thì trả max_turns_reached, KHÔNG tự nói là đã xong.
"""

import copy
import time
from collections.abc import Callable
from typing import Any

import anthropic

import config
from shared.claude import answer_text, api_error, elapsed_ms, new_client
from shared.sessions import Session

from .tasks_tools import TOOL_SCHEMAS, Approver, execute_tool

Event = dict[str, Any]
EventSink = Callable[[Event], None]
MAX_TURNS_LIMIT = 6


async def run_loop(
    session: Session, prompt: str, max_turns: int, emit: EventSink, approver: Approver
) -> None:
    started = time.perf_counter()

    def log(event_type: str, **payload: Any) -> None:
        emit({"type": event_type, "at_ms": elapsed_ms(started), **payload})

    # Copy sâu: nếu run này fail/cancel thì history đã commit không bị bẩn.
    working: list[dict[str, Any]] = copy.deepcopy(session.history)
    working.append({"role": "user", "content": prompt})
    created_ids: list[int] = []
    usage = {"input_tokens": 0, "output_tokens": 0}
    log("run_started", max_turns=max_turns, history_before=len(session.history))

    async with new_client() as client:
        for turn in range(1, max_turns + 1):
            log("request_sent", turn=turn, messages_in_request=len(working))
            try:
                response = await client.messages.create(
                    model=config.LLM_MODEL, max_tokens=512, messages=working,
                    tools=TOOL_SCHEMAS, thinking={"type": "disabled"},
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
                results = []
                for block in [b for b in response.content if b.type == "tool_use"]:
                    tool_input = block.input if isinstance(block.input, dict) else {}
                    log("tool_use", turn=turn, id=block.id, name=block.name, input=tool_input)
                    result = await execute_tool(block.name, tool_input, approver)
                    if "created_id" in result:
                        created_ids.append(int(result["created_id"]))
                    log("tool_result", turn=turn, name=block.name,
                        is_error=result["is_error"], content=result["content"])
                    results.append({"type": "tool_result", "tool_use_id": block.id,
                                    "content": result["content"], "is_error": result["is_error"]})
                working.append({"role": "user", "content": results})
                continue  # Vòng tiếp: model xem tool_result rồi tự quyết định bước sau.

            if response.stop_reason == "end_turn":
                answer = answer_text(response).strip()
                if not answer:
                    # end_turn nhưng không có text thì không phải final hợp lệ.
                    log("error", kind="empty_final", message="end_turn nhưng không có block text.",
                        created_ids=created_ids)
                    return
                working.append({"role": "assistant", "content": answer})
                session.history = working  # COMMIT: chỉ xảy ra ở đúng nhánh thành công này.
                log("history_committed", history_after=len(session.history))
                log("final", answer=answer, turns_used=turn, created_ids=created_ids,
                    usage=dict(usage))
                return

            # max_tokens, refusal, pause_turn...: không được nhận làm câu trả lời cuối.
            log("error", kind="unexpected_stop_reason",
                message=f"stop_reason={response.stop_reason} không phải điều kiện dừng hợp lệ.",
                created_ids=created_ids)
            return

    log("max_turns_reached", max_turns=max_turns, created_ids=created_ids, usage=dict(usage),
        message=f"Hết {max_turns} lượt mà model chưa đưa ra câu trả lời cuối. History không commit.")
