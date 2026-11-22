"""Đọc cấu hình từ backend/.env một lần khi process khởi động.

Uvicorn không tự load .env, nên gọi load_dotenv() tường minh ở đây.
Sửa .env xong phải restart backend (--reload chỉ theo dõi file .py).
"""
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")  # Không override biến đã export sẵn.


def _positive_int_env(name: str, default: int) -> int:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    if not raw.isdigit() or int(raw) <= 0:
        # Fail fast khi khởi động, message nói rõ biến nào sai.
        raise ValueError(f"{name} must be a positive integer, got {raw!r}")
    return int(raw)


ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "").strip()  # Chỉ dùng ở backend.
LLM_MODEL = os.getenv("LLM_MODEL", "").strip()  # Không tự đoán model ID.
LLM_MAX_TOKENS = _positive_int_env("LLM_MAX_TOKENS", 1024)  # Trần max_tokens cho UI.
LLM_TIMEOUT_SECONDS = _positive_int_env("LLM_TIMEOUT_SECONDS", 30)


def missing_llm_settings() -> list[str]:
    """Tên biến env còn thiếu để gọi Claude live (không trả giá trị)."""
    missing = []
    if not ANTHROPIC_API_KEY:
        missing.append("ANTHROPIC_API_KEY")
    if not LLM_MODEL:
        missing.append("LLM_MODEL")
    return missing
