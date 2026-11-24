"""Thu gọn messages[] khi mạng reset request body lớn (Demo 04)."""

import json
from typing import Any

import llm_limits


def estimate_body_bytes(
    *,
    model: str,
    max_tokens: int,
    messages: list[dict[str, Any]],
    tools: list[dict[str, Any]],
    system: str | list[dict[str, Any]] | None = None,
) -> int:
    body: dict[str, Any] = {
        "model": model,
        "max_tokens": max_tokens,
        "messages": messages,
        "tools": tools,
        "thinking": {"type": "disabled"},
    }
    if system:
        body["system"] = system
    return len(json.dumps(body, ensure_ascii=False).encode("utf-8"))


def _summarize_lines(working: list[dict[str, Any]]) -> list[str]:
    lines: list[str] = []
    for message in working:
        role, content = message["role"], message.get("content")
        if role == "user" and isinstance(content, str):
            lines.append(content)
        elif role == "user" and isinstance(content, list):
            for block in content:
                if block.get("type") == "tool_result":
                    raw = str(block.get("content") or "")
                    if "\"body\"" in raw or "already_loaded" in raw or "requirements.md" in raw:
                        cap = 520
                    elif "\"agent\"" in raw and "\"result\"" in raw:
                        cap = 360
                    else:
                        cap = 200
                    lines.append(f"tool_result: {raw[:cap]}")
        elif role == "assistant" and isinstance(content, list):
            for block in content:
                if block.get("type") == "text" and block.get("text"):
                    lines.append(f"assistant: {str(block['text'])[:150]}")
                elif block.get("type") == "tool_use":
                    lines.append(f"tool_use: {block.get('name')}")
        elif role == "assistant" and isinstance(content, str):
            lines.append(f"assistant: {content[:200]}")
    return lines


def compact_loop_messages(working: list[dict[str, Any]]) -> list[dict[str, Any]]:
    text = "\n".join(_summarize_lines(working))
    cap = llm_limits.MAX_COMPACT_CONTENT_CHARS
    if len(text) > cap:
        text = text[-cap:]
    text += "\n\nTiếp tục từ ngữ cảnh trên. Trả lời ngắn bằng tiếng Việt."
    return [{"role": "user", "content": text}]


def aggressive_compact(working: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Chỉ giữ prompt user cuối (run hiện tại) — dùng khi compact vẫn bị connection_error."""
    cap = llm_limits.MAX_AGGRESSIVE_PROMPT_CHARS
    for message in reversed(working):
        if message["role"] == "user" and isinstance(message.get("content"), str):
            text = message["content"]
            if len(text) > cap:
                text = text[-cap:]
            return [{"role": "user", "content": text}]
    return compact_loop_messages(working)