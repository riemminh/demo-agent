"""Đọc file trong sandbox/ — dùng cho subagents (requirements.md)."""

import json
from pathlib import Path

SANDBOX_DIR = Path(__file__).parent / "sandbox"

READ_FILE_SCHEMA = {
    "name": "read_file",
    "description": "Read sandbox text file.",
    "input_schema": {
        "type": "object",
        "properties": {"path": {"type": "string"}},
        "required": ["path"],
    },
}


def read_sandbox_file(relative_path: str) -> dict[str, object]:
    raw = relative_path.strip().lstrip("/")
    if not raw or ".." in raw.split("/"):
        return {"is_error": True, "content": "path không hợp lệ (chỉ file trong sandbox)."}
    target = (SANDBOX_DIR / raw).resolve()
    root = SANDBOX_DIR.resolve()
    if not str(target).startswith(str(root)) or not target.is_file():
        return {"is_error": True, "content": f"Không tìm thấy file sandbox: {raw}"}
    return {"is_error": False, "content": json.dumps({"path": raw, "text": target.read_text(encoding="utf-8")},
                                                     ensure_ascii=False)}