"""Trần token mặc định cho mọi demo — chỉnh ở đây một chỗ.

Env `LLM_MAX_TOKENS` / `LLM_OUTPUT_MAX_TOKENS` trong .env vẫn override khi cần.
"""

# Trần max_tokens UI gửi (Demo 02 Advanced).
DEFAULT_LLM_MAX_TOKENS = 4096

# max_tokens mỗi request khi backend tự gọi (Demo 04 loop, 06 workflow, 08 fallback, …).
DEFAULT_LLM_OUTPUT_MAX_TOKENS = 2048

# Body JSON vượt ngưỡng này hay bị reset trên mạng công ty.
NETWORK_BODY_WARN_BYTES = 1400
# Từ lượt loop thứ 2 (messages > 1) luôn compact — body thật thường lớn hơn estimate.
COMPACT_LOOP_AFTER_MESSAGES = 1
# Demo 04: giữ ít message đã commit khi bắt đầu run (structured + history dài).
MAX_HISTORY_MESSAGES = 4
# Nội dung compact tối đa (ký tự) trong một user turn.
# compact + tools ~670B; giữ dưới NETWORK_BODY_WARN_BYTES.
MAX_COMPACT_CONTENT_CHARS = 700
# aggressive_compact chỉ giữ prompt lượt hiện tại.
MAX_AGGRESSIVE_PROMPT_CHARS = 480