"""File sandbox của Demo 01: side effect THẬT sau khi người dùng bấm Approve.

Đường dẫn cố định trong backend/data/workspace/; browser không gửi path nào vào đây
nên không có đường cho path traversal và không thể đụng tới .env.
"""

from datetime import datetime
from pathlib import Path
from typing import Any

NOTE_NAME = "approval-note.md"
WORKSPACE_DIR = Path(__file__).resolve().parents[2] / "data" / "workspace"
NOTE_PATH = WORKSPACE_DIR / NOTE_NAME
DISPLAY_PATH = f"backend/data/workspace/{NOTE_NAME}"  # Path để hiển thị trên UI.


def build_note(question: str) -> str:
    """Nội dung sẽ ghi nếu được approve; cũng là tool input hiện trên UI trước khi chờ."""
    return (
        "# Approval note\n\n"
        f"- Request: {question.strip()}\n"
        f"- Approved at: {_now()}\n"
        "- Written by: demos/demo_01_runtime (chỉ chạy sau khi user Approve)\n"
    )


def write_note(content: str) -> dict[str, Any]:
    WORKSPACE_DIR.mkdir(parents=True, exist_ok=True)
    NOTE_PATH.write_text(content, encoding="utf-8")
    return read_note()  # Trả về state đọc lại từ disk, không phải state trong RAM.


def read_note() -> dict[str, Any]:
    """Read-back để UI chứng minh file thật, thay vì tin lời agent."""
    if not NOTE_PATH.exists():
        return {"path": DISPLAY_PATH, "exists": False, "content": None,
                "size_bytes": 0, "modified_at": None}
    stat = NOTE_PATH.stat()
    return {
        "path": DISPLAY_PATH,
        "exists": True,
        "content": NOTE_PATH.read_text(encoding="utf-8"),
        "size_bytes": stat.st_size,
        "modified_at": _now(stat.st_mtime),
    }


def delete_note() -> bool:
    """Reset dữ liệu của riêng demo 01. Trả về True nếu file từng tồn tại."""
    existed = NOTE_PATH.exists()
    NOTE_PATH.unlink(missing_ok=True)
    return existed


def _now(timestamp: float | None = None) -> str:
    moment = datetime.fromtimestamp(timestamp) if timestamp else datetime.now()
    return moment.astimezone().isoformat(timespec="seconds")
