"""Demo 08: quyết định CLI vs Messages fallback (dựa trên shared.llm_network)."""

import config
from shared.llm_network import llm_network_hints, messages_api_reachable


def prefer_messages_over_cli() -> bool:
    return config.SDK_MESSAGES_FALLBACK and messages_api_reachable()


def env_network_hints() -> dict[str, object]:
    reachable = messages_api_reachable()
    return {
        **llm_network_hints(),
        "sdk_cli_may_fail_despite_messages": reachable,
        "sdk_messages_fallback": config.SDK_MESSAGES_FALLBACK,
        "prefer_messages_over_cli": prefer_messages_over_cli(),
    }