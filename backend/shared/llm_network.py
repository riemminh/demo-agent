"""Mạng cho Messages API (Python/httpx): probe, hints, proxy env — dùng chung demo 02–08.

Demo 08 CLI fallback chỉ thêm quyết định prefer_messages_over_cli trong transport/.
Không import FastAPI.
"""

import os
import time

import config

_CACHE_AT: float = 0.0
_CACHE_OK: bool | None = None
_PROBE_TTL_SECONDS = 45.0

PROXY_ENV_KEYS = ("HTTPS_PROXY", "HTTP_PROXY", "NO_PROXY", "OPENSSL_CONF")


def copy_proxy_env() -> dict[str, str]:
    """Proxy/TLS env cho subprocess (Claude Code CLI, v.v.)."""
    return {key: os.environ[key] for key in PROXY_ENV_KEYS if os.getenv(key)}


def messages_api_reachable() -> bool:
    """Ping cực nhỏ; cache ngắn để GET /env và /health không spam API."""
    global _CACHE_AT, _CACHE_OK
    now = time.monotonic()
    if _CACHE_OK is not None and now - _CACHE_AT < _PROBE_TTL_SECONDS:
        return _CACHE_OK
    if config.missing_llm_settings():
        _CACHE_AT, _CACHE_OK = now, False
        return False
    try:
        from anthropic import Anthropic

        client = Anthropic(
            api_key=config.ANTHROPIC_API_KEY,
            timeout=min(config.LLM_TIMEOUT_SECONDS, 15),
            max_retries=0,
        )
        msg = client.messages.create(
            model=config.LLM_MODEL,
            max_tokens=8,
            messages=[{"role": "user", "content": "ping"}],
            thinking={"type": "disabled"},
        )
        ok = any(block.type == "text" for block in msg.content)
    except Exception:
        ok = False
    _CACHE_AT, _CACHE_OK = now, ok
    return ok


def llm_network_hints() -> dict[str, object]:
    """Trạng thái mạng dùng chung — gắn vào /api/health và demo env."""
    proxy = bool(os.getenv("HTTPS_PROXY", "").strip() or os.getenv("HTTP_PROXY", "").strip())
    reachable = messages_api_reachable()
    return {
        "messages_api_reachable": reachable,
        "https_proxy_configured": proxy,
        "openssl_conf_active": bool(os.environ.get("OPENSSL_CONF")),
    }