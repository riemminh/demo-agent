"""Hậu xử lý scenario Skills: merge SKILL vào system, thu tool sau load/list."""

from typing import Any, Callable

from .scenarios import RunProfile

Log = Callable[..., None]


def merge_loaded_skills(active: RunProfile, log: Log) -> None:
    from .skills import skill_body_without_frontmatter

    for name in sorted(active.loaded_skills):
        if name in active.merged_skill_names:
            continue
        body = skill_body_without_frontmatter(name)
        active.system = (active.system or "") + f"\n\n[Skill: {name}]\n{body}"
        active.merged_skill_names.add(name)
        log("skill_merged_into_system", name=name, chars=len(body))


def adjust_tools_after_batch(
    active: RunProfile,
    tool_blocks: list,
    tool_schemas: list[dict[str, Any]],
    log: Log,
) -> list[dict[str, Any]]:
    if active.scenario != "skills":
        return tool_schemas
    names = {b.name for b in tool_blocks}
    if active.loaded_skills:
        active.skill_load_enabled = False
        merge_loaded_skills(active, log)
        tool_schemas = [s for s in tool_schemas if s.get("name") != "load_skill"]
        log("skill_tool_removed", loaded=sorted(active.loaded_skills))
    if "list_tasks" in names:
        tool_schemas = []
        log("skill_tools_cleared", reason="đã list_tasks; model chỉ còn trả lời text (end_turn)")
    return tool_schemas