"""Ba tool thật của Demo 03: hàm Python + schema mô tả cho Claude.

Schema (TOOL_SCHEMAS) là LỜI MÔ TẢ gửi cho model; hàm Python mới là thứ thực thi.
Model không chạy được code — nó chỉ xin gọi tool theo tên và input.
"""

from typing import Any

from pydantic import BaseModel, Field


class SumNumbersInput(BaseModel):
    numbers: list[float] = Field(min_length=1, max_length=50)


class CountWordsInput(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


class DivideNumbersInput(BaseModel):
    numerator: float
    denominator: float


def sum_numbers(numbers: list[float]) -> float:
    return sum(numbers)


def count_words(text: str) -> int:
    return len(text.split())


def divide_numbers(numerator: float, denominator: float) -> float:
    # Không chặn denominator=0: scenario Error cần một lỗi thật từ Python.
    return numerator / denominator


# Schema theo đúng format Anthropic tools: name + description + input_schema (JSON Schema).
TOOL_SCHEMAS: list[dict[str, Any]] = [
    {
        "name": "sum_numbers",
        "description": "Cộng một danh sách số và trả về tổng. Dùng khi người dùng cần tính tổng.",
        "input_schema": {
            "type": "object",
            "properties": {"numbers": {"type": "array", "items": {"type": "number"},
                                       "description": "Các số cần cộng"}},
            "required": ["numbers"],
        },
    },
    {
        "name": "count_words",
        "description": "Đếm số từ trong một đoạn văn bản.",
        "input_schema": {
            "type": "object",
            "properties": {"text": {"type": "string", "description": "Văn bản cần đếm từ"}},
            "required": ["text"],
        },
    },
    {
        "name": "divide_numbers",
        "description": "Chia numerator cho denominator và trả về thương.",
        "input_schema": {
            "type": "object",
            "properties": {"numerator": {"type": "number"}, "denominator": {"type": "number"}},
            "required": ["numerator", "denominator"],
        },
    },
]


def schemas_for(names: list[str]) -> list[dict[str, Any]]:
    """Chỉ gửi cho Claude những tool mà scenario hiện tại cho phép."""
    return [schema for schema in TOOL_SCHEMAS if schema["name"] in names]
