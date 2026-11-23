// Metadata 8 demo của Phase 1 (plans/00-START-HERE.md, mục 1).
// Chỉ demo có `route` là đã implement và chạy được -> mới lên sidebar.
// Demo chưa có code: không route, không nút Run, chỉ nằm ở Roadmap trên Workspace Home.
export type Demo = {
  id: string;
  title: string;
  mechanism: string; // Một câu: demo này giải thích cơ chế gì.
  scenarios: string[]; // Scenario đã chạy được, hoặc dự kiến với demo trong roadmap.
  route?: string;
};

export type LiveDemo = Demo & { route: string };

export const DEMOS: Demo[] = [
  {
    id: "01", title: "Agent Runtime", route: "/demos/01-runtime",
    mechanism: "POST → asyncio Task → emit → Queue → SSE → React; Future chờ Approve/Reject; Task.cancel() ở backend.",
    scenarios: ["SSE", "Approval", "Cancel"],
  },
  {
    id: "02", title: "Claude API", route: "/demos/02-claude-api",
    mechanism: "Messages API thật: request, response, stop_reason, usage, latency; history do app truyền; streaming hai tầng.",
    scenarios: ["One-shot", "History On/Off", "Streaming"],
  },
  {
    id: "03", title: "Tools & Registry", route: "/demos/03-tools",
    mechanism: "Claude trả tool_use, registry Python thực thi và gửi tool_result; một tool round đầy đủ.",
    scenarios: ["Single Tool", "Registry", "Error"],
  },
  {
    id: "04", title: "Manual Agent Loop", route: "/demos/04-manual-loop",
    mechanism: "Loop messages.create → tool_use → tool_result tới end_turn, có MAX_TURNS, approval trước khi ghi SQLite và history chỉ commit khi thành công.",
    scenarios: ["Normal", "Max Turns", "Tool Failure"],
  },
  {
    id: "05", title: "Structured Output", route: "/demos/05-structured-output",
    mechanism: "Native structured output theo JSON Schema, rồi validate hai tầng (schema + nghiệp vụ) và repair một lần có kiểm soát.",
    scenarios: ["Generate", "Validate", "Repair"],
  },
  {
    id: "06", title: "Agent Workflows", route: "/demos/06-workflows",
    mechanism: "Năm pattern viết bằng Python + Claude API, có trace thời gian thật và budget call cho từng pattern.",
    scenarios: ["Chaining", "Routing", "Parallel", "Orchestrator", "Evaluator"],
  },
  {
    id: "07", title: "MCP", route: "/demos/07-mcp",
    mechanism: "MCP server riêng chạy qua stdio; client initialize, tools/list, tools/call, resources và prompts thật.",
    scenarios: ["Connect & Discover", "Call Tool", "Resources & Prompts"],
  },
  {
    id: "08", title: "Claude Agent SDK",
    mechanism: "SDK quản lý Agent Loop; app vẫn kiểm soát permissions, hooks, skills, subagents.",
    scenarios: ["Basic", "Permissions/Hooks", "Skills", "Subagents"],
  },
];

export const LIVE_DEMOS = DEMOS.filter((demo): demo is LiveDemo => Boolean(demo.route));
export const ROADMAP_DEMOS = DEMOS.filter((demo) => !demo.route);
