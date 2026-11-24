"""Kiểm tra trước khi demo gọi Claude (02–06). Demo 08 thêm transport CLI."""

from typing import Any

import config
from shared.claude import config_error
from shared.llm_network import llm_network_hints, messages_api_reachable


def preflight_llm_error() -> dict[str, Any] | None:
    """None = OK; else dict tương thích api_error / SSE event type=error."""
    if config.missing_llm_settings():
        return config_error()
    if messages_api_reachable():
        return None
    hints = llm_network_hints()
    tips: list[str] = []
    if not hints.get("openssl_conf_active"):
        tips.append("restart backend (config.py gán OPENSSL_CONF) hoặc export OPENSSL_CONF=backend/openssl-classic-groups.cnf")
    if not hints.get("https_proxy_configured"):
        tips.append("đặt HTTPS_PROXY trong backend/.env")
    tips.append("loop nhiều lượt (Demo 04) có thể fail khi body > ~1.5KB dù probe OK")
    return {
        "kind": "connection_error",
        "upstream_status": None,
        "message": "Messages API không kết nối được (preflight probe). " + " — ".join(tips),
        "network_hints": hints,
    }