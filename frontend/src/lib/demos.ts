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
    id: "03", title: "Tools & Registry",
    mechanism: "Claude đề nghị tool, Python dispatch qua registry và trả tool_result.",
    scenarios: ["Single Tool", "Registry", "Error"],
  },
  {
    id: "04", title: "Manual Agent Loop",
    mechanism: "Tự viết loop messages.create → tool_use → tool_result, có stop condition và rollback history.",
    scenarios: ["Normal", "Max Turns", "Failure/Rollback"],
  },
  {
    id: "05", title: "Structured Output",
    mechanism: "JSON có schema, validation nghiệp vụ và repair có giới hạn.",
    scenarios: ["Generate", "Validate", "Repair"],
  },
  {
    id: "06", title: "Agent Workflows",
    mechanism: "So sánh fixed workflow và dynamic workflow qua năm pattern.",
    scenarios: ["Chaining", "Routing", "Parallel", "Orchestrator", "Evaluator"],
  },
  {
    id: "07", title: "MCP",
    mechanism: "MCP server/client thật: discover tool, call tool, resource/prompt.",
    scenarios: ["Discover", "Call Tool", "Resource/Prompt"],
  },
  {
    id: "08", title: "Claude Agent SDK",
    mechanism: "SDK quản lý Agent Loop; app vẫn kiểm soát permissions, hooks, skills, subagents.",
    scenarios: ["Basic", "Permissions/Hooks", "Skills", "Subagents"],
  },
];

export const LIVE_DEMOS = DEMOS.filter((demo): demo is LiveDemo => Boolean(demo.route));
export const ROADMAP_DEMOS = DEMOS.filter((demo) => !demo.route);
