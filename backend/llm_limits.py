"""Trần token mặc định cho mọi demo — chỉnh ở đây một chỗ.

Env `LLM_MAX_TOKENS` / `LLM_OUTPUT_MAX_TOKENS` trong .env vẫn override khi cần.
"""

# Trần max_tokens UI gửi (Demo 02 Advanced).
DEFAULT_LLM_MAX_TOKENS = 4096

# max_tokens mỗi request khi backend tự gọi (Demo 04 loop, 06 workflow, …).
DEFAULT_LLM_OUTPUT_MAX_TOKENS = 2048

# Demo 04: giữ ít message đã commit khi bắt đầu run (structured + history dài).
MAX_HISTORY_MESSAGES = 4