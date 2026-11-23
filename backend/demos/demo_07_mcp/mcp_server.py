"""MCP Server thật, chạy độc lập qua stdio (MCP Python SDK 2.x — MCPServer).

Chạy standalone:
    cd backend && uv run python -m demos.demo_07_mcp.mcp_server

Server này KHÔNG biết gì về FastAPI hay Claude: nó chỉ công bố tools/resources/prompts
theo protocol. Tuyệt đối không print() ra stdout — stdio transport cần stdout sạch.
Hai tool đều CHỈ ĐỌC; dữ liệu seed do bridge FastAPI tạo, không phải server này.
"""

from mcp.server.mcpserver import MCPServer
from mcp.server.mcpserver.exceptions import ToolError

from shared import task_store

DEMO_SCOPE = "mcp"  # Scope riêng: không đụng dữ liệu của Demo 04 (manual_loop).

server = MCPServer(
    name="agent-demo-task-server",
    instructions="Server đọc task sandbox của AI Agent Demo Workspace (scope mcp).",
)


@server.tool(description="Liệt kê mọi task trong sandbox (scope mcp). Không cần tham số.")
def list_tasks() -> list[dict]:
    return task_store.list_tasks(DEMO_SCOPE)


@server.tool(description="Đọc một task theo id. Lỗi nếu id không tồn tại.")
def get_task(task_id: int) -> dict:
    task = task_store.get_task(DEMO_SCOPE, task_id)
    if task is None:
        # ToolError = lỗi mình LƯỜNG TRƯỚC: client nhận đúng message này kèm is_error=true,
        # server log ở mức INFO không traceback. Exception khác bị coi là crash và client
        # chỉ nhận message chung chung.
        raise ToolError(f"TaskNotFound: không có task id={task_id} trong scope {DEMO_SCOPE}")
    return task


@server.resource(
    "workspace://tasks/summary",
    name="task-summary",
    description="Tóm tắt task sandbox dưới dạng Markdown, sinh từ dữ liệu SQLite thật.",
    mime_type="text/markdown",
)
def tasks_summary() -> str:
    tasks = task_store.list_tasks(DEMO_SCOPE)
    if not tasks:
        return "# Task sandbox (scope mcp)\n\nChưa có task nào. Dùng nút Seed trên UI để tạo.\n"
    by_priority: dict[str, int] = {}
    for task in tasks:
        by_priority[task["priority"]] = by_priority.get(task["priority"], 0) + 1
    lines = [f"# Task sandbox (scope mcp)", "", f"Tổng: {len(tasks)} task", ""]
    lines += [f"- priority {priority}: {count}" for priority, count in sorted(by_priority.items())]
    lines += ["", "| id | title | priority | status |", "|---|---|---|---|"]
    lines += [f"| {t['id']} | {t['title']} | {t['priority']} | {t['status']} |" for t in tasks]
    return "\n".join(lines) + "\n"


@server.prompt(description="Template nhắc model lập kế hoạch cho một task, dựa trên task đang có.")
def plan_task(goal: str) -> str:
    existing = ", ".join(task["title"] for task in task_store.list_tasks(DEMO_SCOPE)) or "chưa có"
    return (
        f"Bạn đang làm việc trong một workspace có các task: {existing}.\n"
        f"Hãy lập kế hoạch ngắn (tối đa 3 bước) cho mục tiêu: {goal}.\n"
        "Nếu mục tiêu trùng task đã có thì nói rõ là trùng."
    )


if __name__ == "__main__":
    task_store.init_db()  # Bảng có thể chưa tồn tại nếu chạy server trước Demo 04.
    server.run("stdio")
