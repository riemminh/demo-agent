// Nội dung tĩnh của Demo 07: scenario, breakpoint, kết quả cần đạt.

export type ScenarioKey = "discover" | "call" | "resources";

export const SCENARIOS: Record<ScenarioKey, { label: string; description: string; action: string }> = {
  discover: {
    label: "Connect & Discover",
    description: "Client spawn server qua stdio, initialize session rồi gọi tools/list. Tool name và input_schema đều do SERVER công bố.",
    action: "Connect → List Tools",
  },
  call: {
    label: "Call Tool",
    description: "Client gọi tools/call. Server đọc SQLite (scope mcp) và trả kết quả thật; so với bảng DB bên dưới sẽ thấy khớp.",
    action: "Call tool",
  },
  resources: {
    label: "Resources & Prompts",
    description: "Ngoài tool, server còn công bố resource (workspace://tasks/summary) và prompt template (plan_task).",
    action: "List & read",
  },
};

export const SCENARIO_KEYS = Object.keys(SCENARIOS) as ScenarioKey[];

export const BREAKPOINTS = [
  {
    file: "backend/demos/demo_07_mcp/mcp_server.py", fn: "@server.tool()",
    code: "def list_tasks() -> list[dict]:",
    why: "SDK tự sinh `input_schema` từ type hint của hàm. Client không cần biết trước tool nào — nó đọc danh sách từ `tools/list`.",
  },
  {
    file: "backend/demos/demo_07_mcp/mcp_server.py", fn: "get_task()",
    code: 'raise ToolError(f"TaskNotFound: không có task id={task_id}',
    why: "`ToolError` = lỗi lường trước: client nhận đúng message kèm `is_error=true`. Exception khác bị coi là crash và client chỉ nhận message chung chung, traceback nằm ở log server.",
  },
  {
    file: "backend/demos/demo_07_mcp/mcp_client.py", fn: "SERVER_PARAMS",
    code: 'args=["-m", "demos.demo_07_mcp.mcp_server"],',
    why: "Tham số server là hằng số trong code. UI không gửi command/đường dẫn nào, nên không có chỗ cho command injection.",
  },
  {
    file: "backend/demos/demo_07_mcp/mcp_client.py", fn: "call_tool()",
    code: "async with Client(SERVER_PARAMS) as client:",
    why: "Vào block: spawn subprocess + initialize. Ra khỏi block: SDK đóng session và kill subprocess, nên refresh/retry không để lại process mồ côi.",
  },
];
