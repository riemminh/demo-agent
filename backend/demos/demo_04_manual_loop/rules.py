"""Đọc CLAUDE.md và file trong .claude/rules/ — ghép vào system prompt (không qua SDK)."""

from pathlib import Path

SANDBOX_DIR = Path(__file__).parent / "sandbox"
RULES_DIR = SANDBOX_DIR / ".claude" / "rules"
BASE_SYSTEM = "Bạn là trợ lý quản lý task. Trả lời ngắn gọn bằng tiếng Việt."


def _read_if_exists(path: Path) -> str | None:
    if not path.is_file():
        return None
    return path.read_text(encoding="utf-8").strip()


def load_rules_bundle() -> dict[str, object]:
    """Trả metadata file đã đọc và system prompt đủ để gửi Claude."""
    loaded: list[dict[str, str]] = []
    parts = [BASE_SYSTEM]

    claude = _read_if_exists(SANDBOX_DIR / "CLAUDE.md")
    if claude:
        loaded.append({"path": "CLAUDE.md", "content": claude})
        parts.append(f"\n\n[CLAUDE.md]\n{claude}")

    if RULES_DIR.is_dir():
        for rule_file in sorted(RULES_DIR.glob("*.md")):
            text = rule_file.read_text(encoding="utf-8").strip()
            rel = str(rule_file.relative_to(SANDBOX_DIR))
            loaded.append({"path": rel, "content": text})
            parts.append(f"\n\n[{rel}]\n{text}")

    system_prompt = "".join(parts)
    return {"loaded_files": loaded, "system_prompt": system_prompt, "base_system": BASE_SYSTEM}