"""Hai tầng kiểm tra khác nhau, chạy hoàn toàn offline (không gọi Claude).

1. Schema validation (Pydantic): đúng kiểu, đủ field, enum hợp lệ.
2. Semantic validation: đúng kiểu rồi vẫn có thể vô nghĩa về nghiệp vụ.
   Ví dụ estimated_hours = -4 pass kiểu float nhưng sai logic.
"""

from typing import Any

from pydantic import ValidationError

from .schemas import TaskDraft

MAX_HOURS = 80
MAX_HOURS_FOR_HIGH = 16
MIN_TITLE_LENGTH = 5
PLACEHOLDER_TITLES = {"todo", "task", "n/a", "tbd", "none", "untitled"}


def validate_semantics(draft: TaskDraft) -> list[str]:
    """Ràng buộc nghiệp vụ. Schema không diễn tả được những điều này."""
    errors: list[str] = []
    if draft.estimated_hours <= 0:
        errors.append(f"estimated_hours phải > 0, nhận {draft.estimated_hours}")
    elif draft.estimated_hours > MAX_HOURS:
        errors.append(f"estimated_hours phải <= {MAX_HOURS} (một task không quá 2 tuần), "
                      f"nhận {draft.estimated_hours}")
    title = draft.title.strip()
    if len(title) < MIN_TITLE_LENGTH:
        errors.append(f"title phải có ít nhất {MIN_TITLE_LENGTH} ký tự, nhận {title!r}")
    elif title.lower() in PLACEHOLDER_TITLES:
        errors.append(f"title không được là placeholder ({title!r})")
    if draft.priority == "high" and draft.estimated_hours > MAX_HOURS_FOR_HIGH:
        errors.append(f"task priority=high nên <= {MAX_HOURS_FOR_HIGH} giờ; "
                      "task lớn hơn thì phải chia nhỏ")
    return errors


def _schema_errors(error: ValidationError) -> list[str]:
    return [f"{'.'.join(str(part) for part in item['loc']) or '(root)'}: {item['msg']}"
            for item in error.errors()]


def validate_draft(raw: Any) -> dict[str, Any]:
    """Trả kết quả hai tầng kiểm tra; `accepted` chỉ True khi cả hai tầng sạch."""
    events: list[dict[str, Any]] = []
    if not isinstance(raw, dict):
        return {
            "accepted": False, "draft": None,
            "schema_errors": [f"(root): phải là JSON object, nhận {type(raw).__name__}"],
            "semantic_errors": [],
            "events": [{"type": "schema_failed", "stage": "pydantic"}],
        }

    try:
        draft = TaskDraft(**raw)
    except ValidationError as error:
        # Sai kiểu/enum/thiếu field: dừng ở tầng 1, không chạy tầng 2.
        return {
            "accepted": False, "draft": None, "schema_errors": _schema_errors(error),
            "semantic_errors": [],
            "events": [{"type": "schema_failed", "stage": "pydantic",
                        "error_count": error.error_count()}],
        }
    events.append({"type": "schema_passed", "stage": "pydantic"})

    semantic_errors = validate_semantics(draft)
    events.append({
        "type": "semantic_passed" if not semantic_errors else "semantic_failed",
        "stage": "validate_semantics", "error_count": len(semantic_errors),
    })
    return {
        "accepted": not semantic_errors, "draft": draft.model_dump(),
        "schema_errors": [], "semantic_errors": semantic_errors, "events": events,
    }


def repair_instruction(raw: Any, errors: list[str]) -> str:
    """Prompt repair chỉ gồm object fail + đúng những lỗi đã phát hiện."""
    return (
        "Object JSON sau không hợp lệ:\n"
        f"{raw}\n\n"
        "Các lỗi cần sửa:\n"
        + "\n".join(f"- {error}" for error in errors)
        + "\n\nHãy trả lại object đã sửa, giữ nguyên ý định ban đầu của task. "
          f"Ràng buộc: 0 < estimated_hours <= {MAX_HOURS}; nếu priority=high thì "
          f"estimated_hours <= {MAX_HOURS_FOR_HIGH}; title ít nhất {MIN_TITLE_LENGTH} ký tự "
          "và không phải placeholder."
    )
