"""Schema của Demo 05. Một model Pydantic duy nhất dùng cho CẢ BA việc:

1. `output_format` cho native structured output của Claude (SDK tự sinh JSON Schema).
2. Validate JSON người dùng sửa tay.
3. Validate lại object sau khi repair.
Nhờ vậy "schema mà model thấy" và "schema mà app kiểm tra" không thể lệch nhau.
"""

from typing import Literal

from pydantic import BaseModel, Field


class TaskDraft(BaseModel):
    title: str = Field(description="Tiêu đề task, viết rõ việc cần làm")
    priority: Literal["low", "medium", "high"] = Field(description="Mức ưu tiên")
    estimated_hours: float = Field(description="Số giờ ước tính để làm xong task")


def json_schema() -> dict:
    """JSON Schema để hiển thị trên UI (đúng schema mà SDK gửi cho model)."""
    return TaskDraft.model_json_schema()
