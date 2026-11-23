"""Registry: map tên tool -> (model validate input, hàm Python). Không eval/exec,
không dynamic import. Tool nào không có trong dict này thì không chạy được.
"""

from collections.abc import Callable
from typing import Any

from pydantic import BaseModel, ValidationError

from .tools import (
    CountWordsInput, DivideNumbersInput, SumNumbersInput,
    count_words, divide_numbers, sum_numbers,
)

TOOL_REGISTRY: dict[str, tuple[type[BaseModel], Callable[..., Any]]] = {
    "sum_numbers": (SumNumbersInput, sum_numbers),
    "count_words": (CountWordsInput, count_words),
    "divide_numbers": (DivideNumbersInput, divide_numbers),
}


def execute(name: str, tool_input: dict[str, Any]) -> dict[str, Any]:
    """Trả {is_error, content, value}. Lỗi tool là DỮ LIỆU trả cho Claude, không raise lên HTTP."""
    entry = TOOL_REGISTRY.get(name)
    if entry is None:
        # Model có thể bịa tên tool: fail closed, không thử gọi gì cả.
        return {"is_error": True, "content": f"Unknown tool: {name}", "value": None}

    input_model, function = entry
    try:
        validated = input_model(**tool_input)
    except ValidationError as error:
        return {"is_error": True, "value": None,
                "content": f"Input không hợp lệ cho {name}: {error.error_count()} lỗi — "
                           + "; ".join(f"{'.'.join(str(p) for p in item['loc'])}: {item['msg']}"
                                       for item in error.errors())}
    except TypeError as error:  # input có key lạ hoặc không phải dict
        return {"is_error": True, "content": f"Input sai dạng cho {name}: {error}", "value": None}

    try:
        value = function(**validated.model_dump())
    except Exception as error:
        # Lỗi nghiệp vụ của tool (vd ZeroDivisionError): chỉ trả tên lỗi + message,
        # không trả traceback ra UI.
        return {"is_error": True, "content": f"{type(error).__name__}: {error}", "value": None}

    return {"is_error": False, "content": str(value), "value": value}
