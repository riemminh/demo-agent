"""Gọi Claude cho Demo 05: generate và repair, đều dùng native structured output.

`client.messages.parse(output_format=TaskDraft)` để SDK sinh JSON Schema và gửi trong
`output_config.format` — model bị ràng buộc theo schema, không phải "nhờ prompt trả JSON".
Repair chỉ chạy đúng MỘT lần khi người dùng bấm; không tự lặp.
"""

import time
from typing import Any

import anthropic

import config
from shared.claude import api_error, config_error, elapsed_ms, new_client

from .schemas import TaskDraft
from .validation import repair_instruction, validate_draft


def _metrics(message: Any, latency_ms: float) -> dict[str, Any]:
    return {"api_calls": 1, "latency_ms": latency_ms,
            "input_tokens": message.usage.input_tokens,
            "output_tokens": message.usage.output_tokens}


async def _parse_draft(prompt: str, max_tokens: int) -> dict[str, Any]:
    """Một request parse() -> {draft thô, response, metrics} hoặc error."""
    if config.missing_llm_settings():
        return {"error": config_error()}
    started = time.perf_counter()
    async with new_client() as client:
        try:
            message = await client.messages.parse(
                model=config.LLM_MODEL, max_tokens=max_tokens,
                messages=[{"role": "user", "content": prompt}],
                output_format=TaskDraft, thinking={"type": "disabled"},
            )
        except anthropic.APIError as error:
            return {"error": api_error(error)}
    latency = elapsed_ms(started)
    # parsed_output là TaskDraft do SDK parse; vẫn chạy validate của app để kiểm semantic.
    parsed = message.parsed_output
    return {
        "raw": parsed.model_dump() if parsed else None,
        "response": message.to_dict(),
        "metrics": _metrics(message, latency),
    }


def _result(stage: str, raw: Any, validation: dict[str, Any] | None,
            call: dict[str, Any], events: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "stage": stage,
        "status": "failed" if call.get("error") else "succeeded",
        "raw": raw,
        "accepted": bool(validation and validation["accepted"]),
        "schema_errors": validation["schema_errors"] if validation else [],
        "semantic_errors": validation["semantic_errors"] if validation else [],
        "response": call.get("response"),
        "metrics": call.get("metrics"),
        "error": call.get("error"),
        "events": events,
    }


async def generate_draft(prompt: str, max_tokens: int) -> dict[str, Any]:
    events: list[dict[str, Any]] = [{"type": "request_sent", "mode": "parse(output_format=TaskDraft)"}]
    call = await _parse_draft(prompt, max_tokens)
    if call.get("error"):
        events.append({"type": "error", **call["error"]})
        return _result("generate", None, None, call, events)
    events.append({"type": "response_received", "note": "model trả JSON theo schema"})
    validation = validate_draft(call["raw"])  # Schema đúng vẫn phải qua semantic.
    events.extend(validation["events"])
    return _result("generate", call["raw"], validation, call, events)


async def repair_draft(raw: Any, errors: list[str], max_tokens: int) -> dict[str, Any]:
    """Một lần repair: gửi object fail + danh sách lỗi, rồi validate lại. Có thể vẫn fail."""
    events: list[dict[str, Any]] = [{"type": "repair_requested", "error_count": len(errors)}]
    call = await _parse_draft(repair_instruction(raw, errors), max_tokens)
    if call.get("error"):
        events.append({"type": "error", **call["error"]})
        return _result("repair", raw, None, call, events)
    events.append({"type": "response_received", "note": "object sau repair"})
    validation = validate_draft(call["raw"])
    events.extend(validation["events"])
    result = _result("repair", call["raw"], validation, call, events)
    result["before"] = raw  # Để UI so sánh trước/sau.
    return result
