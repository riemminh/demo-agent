"""Khi finish=structured: câu trả lời cuối phải là TaskDraft hợp lệ (schema + semantic)."""

import json
import re
from typing import Any

from demos.demo_05_structured_output.validation import repair_instruction, validate_draft

_JSON_FENCE = re.compile(r"```(?:json)?\s*([\s\S]*?)```", re.IGNORECASE)


def extract_json_object(text: str) -> Any | None:
    stripped = text.strip()
    match = _JSON_FENCE.search(stripped)
    payload = (match.group(1) if match else stripped).strip()
    try:
        return json.loads(payload)
    except json.JSONDecodeError:
        return None


def validate_structured_answer(answer: str) -> dict[str, Any]:
    raw = extract_json_object(answer)
    if raw is None:
        return {
            "accepted": False,
            "schema_errors": ["Không parse được JSON từ câu trả lời cuối."],
            "semantic_errors": [],
        }
    return validate_draft(raw)


def structured_end_turn_action(
    answer: str, *, turn: int, max_turns: int
) -> dict[str, Any]:
    """Quyết định commit / yêu cầu sửa trong loop / fail khi hết lượt."""
    checked = validate_structured_answer(answer)
    if checked.get("accepted"):
        draft = checked["draft"]
        return {
            "action": "commit",
            "checked": checked,
            "answer": json.dumps(draft, ensure_ascii=False),
        }
    errors = list(checked.get("schema_errors", [])) + list(checked.get("semantic_errors", []))
    if turn < max_turns and errors:
        raw = extract_json_object(answer)
        repair_raw: Any = raw if isinstance(raw, dict) else answer
        return {
            "action": "repair",
            "checked": checked,
            "user_content": repair_instruction(repair_raw, errors),
        }
    return {"action": "fail", "checked": checked}