"""Discover SKILL.md (chỉ metadata) và load_skill khi model yêu cầu."""

import re
from pathlib import Path
from typing import Any

SANDBOX_DIR = Path(__file__).parent / "sandbox"
SKILLS_ROOT = SANDBOX_DIR / ".claude" / "skills"

_FRONTMATTER = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)


def _parse_frontmatter(text: str) -> dict[str, str]:
    match = _FRONTMATTER.match(text)
    if not match:
        return {}
    meta: dict[str, str] = {}
    for line in match.group(1).splitlines():
        if ":" in line:
            key, val = line.split(":", 1)
            meta[key.strip()] = val.strip()
    return meta


def discover_skills() -> list[dict[str, str]]:
    if not SKILLS_ROOT.is_dir():
        return []
    found: list[dict[str, str]] = []
    for skill_file in sorted(SKILLS_ROOT.glob("*/SKILL.md")):
        raw = skill_file.read_text(encoding="utf-8")
        meta = _parse_frontmatter(raw)
        name = meta.get("name") or skill_file.parent.name
        found.append({
            "name": name,
            "description": meta.get("description", ""),
            "path": str(skill_file.relative_to(SANDBOX_DIR)),
        })
    return found


def load_skill_content(name: str) -> str | None:
    for skill in discover_skills():
        if skill["name"] == name:
            path = SANDBOX_DIR / skill["path"]
            return path.read_text(encoding="utf-8")
    return None


def skill_body_without_frontmatter(name: str) -> str:
    raw = load_skill_content(name)
    if not raw:
        return ""
    body = _FRONTMATTER.sub("", raw, count=1).strip()
    return body[:450]


def skills_system_append(skills: list[dict[str, str]]) -> str:
    if not skills:
        return ""
    lines = [
        "\n\nSkills (chỉ metadata — gọi load_skill một lần để nạp SKILL.md):",
        "Quy trình: load_skill → (tuỳ chọn) list_tasks → trả lời kế hoạch bằng text cuối.",
        "Không gọi load_skill lại sau khi đã có tool_result skill.",
    ]
    for skill in skills:
        lines.append(f"- {skill['name']}: {skill['description']}")
    return "\n".join(lines)


LOAD_SKILL_NEXT = (
    "Tiếp theo: gọi list_tasks nếu cần, rồi trả lời kế hoạch bằng text (end_turn). "
    "Không gọi load_skill lại."
)


LOAD_SKILL_SCHEMA: dict[str, Any] = {
    "name": "load_skill",
    "description": "Load full SKILL.md content by skill name.",
    "input_schema": {
        "type": "object",
        "properties": {"name": {"type": "string"}},
        "required": ["name"],
    },
}