"""CLI vs Messages fallback — xóa cả package này khi CLI ổn định trên mạng prod.

Entry points dùng transport:
- sdk_agent.run_query / inspect_session
- environment.env_summary (network hints)
- customization.build_options (cli_child_env)
"""

from .cli_env import cli_child_env
from .cli_run import run_via_cli
from .inspect_offline import inspect_without_cli
from .messages_run import run_via_messages
from shared.llm_network import messages_api_reachable

from .network import env_network_hints, prefer_messages_over_cli

__all__ = [
    "cli_child_env",
    "env_network_hints",
    "inspect_without_cli",
    "messages_api_reachable",
    "prefer_messages_over_cli",
    "run_via_cli",
    "run_via_messages",
]