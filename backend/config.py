"""Đọc cấu hình từ backend/.env một lần khi process khởi động.

Uvicorn không tự load .env, nên gọi load_dotenv() tường minh ở đây.
Sửa .env xong phải restart backend (--reload chỉ theo dõi file .py).
"""
import os
from pathlib import Path

# Trước dotenv/httpx: tránh TLS post-quantum bị reset trên một số mạng (demo 02–06).
_openssl_cnf = Path(__file__).resolve().parent / "openssl-classic-groups.cnf"
if _openssl_cnf.is_file() and not os.environ.get("OPENSSL_CONF"):
    os.environ["OPENSSL_CONF"] = str(_openssl_cnf)

from dotenv import load_dotenv

import llm_limits

load_dotenv(Path(__file__).parent / ".env")  # Không override biến đã export sẵn.


def _bool_env(name: str, default: bool) -> bool:
    raw = os.getenv(name, "").strip().lower()
    if not raw:
        return default
    return raw in {"1", "true", "yes", "on"}


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
LLM_MAX_TOKENS = _positive_int_env("LLM_MAX_TOKENS", llm_limits.DEFAULT_LLM_MAX_TOKENS)
_llm_output = _positive_int_env("LLM_OUTPUT_MAX_TOKENS", llm_limits.DEFAULT_LLM_OUTPUT_MAX_TOKENS)
LLM_OUTPUT_MAX_TOKENS = min(_llm_output, LLM_MAX_TOKENS)
LLM_TIMEOUT_SECONDS = _positive_int_env("LLM_TIMEOUT_SECONDS", 30)
# Demo 08: đủ chỗ cho CLI retry mạng; vẫn có max_turns/max_budget_usd trong SDK options.
SDK_RUN_TIMEOUT_SECONDS = _positive_int_env("SDK_RUN_TIMEOUT_SECONDS", 180)
SDK_MAX_RETRIES = _positive_int_env("SDK_MAX_RETRIES", 0)  # CLAUDE_CODE_MAX_RETRIES; 0 = không retry trên mạng chết
# Demo 08: khi CLI (Bun) ECONNRESET nhưng Messages API (Python) OK — chạy basic qua Python.
SDK_MESSAGES_FALLBACK = _bool_env("SDK_MESSAGES_FALLBACK", True)


def missing_llm_settings() -> list[str]:
    """Tên biến env còn thiếu để gọi Claude live (không trả giá trị)."""
    missing = []
    if not ANTHROPIC_API_KEY:
        missing.append("ANTHROPIC_API_KEY")
    if not LLM_MODEL:
        missing.append("LLM_MODEL")
    return missing
