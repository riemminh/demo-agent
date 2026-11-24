"""Run scenario qua Messages API + tool in-process (không spawn CLI API call)."""

import json
import time
from collections.abc import Awaitable, Callable

import anthropic

import config
from shared import task_store
from shared.claude import answer_text, api_error, elapsed_ms, new_client

from ..customization import SCENARIOS
from ..sdk_tools import CREATE_TOOL, DEMO_SCOPE, LIST_TOOL

Log = Callable[..., None]
Approver = Callable[[str, dict[str, object]], Awaitable[bool]]


async def run_via_messages(scenario: str, prompt: str, log: Log, _approver: Approver) -> None:
    scen = SCENARIOS[scenario]
    log("sdk_connected", claude_code_version="messages-fallback",
        current_permission_mode="fallback", output_style="default",
        subagents_registered=[], transport="python_messages_api")
    log("hook_fired", hook="UserPromptSubmit", tool=None, prompt=prompt, session_id=None)
    log("system", subtype="messages_fallback",
        detail=f"transport.prefer_messages_over_cli — scenario {scenario}")

    tasks = task_store.list_tasks(DEMO_SCOPE)
    if LIST_TOOL in scen["tools"]:
        log("tool_use", tool=LIST_TOOL, input={}, id="fallback-list-1")
        log("tool_result", tool_use_id="fallback-list-1", is_error=False,
            content=json.dumps(tasks, ensure_ascii=False)[:400])

    user_text = prompt.strip()
    if LIST_TOOL in scen["tools"]:
        user_text += f"\n\nlist_tasks ({DEMO_SCOPE}):\n{json.dumps(tasks, ensure_ascii=False)}"
    if CREATE_TOOL in scen["tools"] and _wants_create(prompt):
        user_text += "\n(create_task + Approve: chưa simulate trong fallback.)"
    user_text += "\nTrả lời ngắn bằng tiếng Việt."

    started = time.perf_counter()
    try:
        message = await new_client().messages.create(
            model=config.LLM_MODEL,
            max_tokens=config.LLM_OUTPUT_MAX_TOKENS,
            messages=[{"role": "user", "content": user_text}],
            thinking={"type": "disabled"},
        )
    except anthropic.APIError as error:
        err = api_error(error)
        log("error", kind=err["kind"], message=err["message"])
        log("result", is_error=True, num_turns=1, duration_ms=elapsed_ms(started),
            text=err["message"], total_cost_usd=0, usage=None, session_id=None)
        return
    answer = answer_text(message)
    usage = message.usage
    log("assistant_text", text=answer)
    log("result", is_error=False, num_turns=1, duration_ms=elapsed_ms(started),
        total_cost_usd=None, text=answer, session_id=f"messages-fallback-{scenario}",
        usage={"input_tokens": usage.input_tokens, "output_tokens": usage.output_tokens})


def _wants_create(prompt: str) -> bool:
    lower = prompt.lower()
    return "tạo" in lower or "create" in lower or "login" in lower