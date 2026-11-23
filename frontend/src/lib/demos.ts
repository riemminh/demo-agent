// Metadata của 8 demo (refactor-plan-8-demos.md, mục 2).
// `implemented` phản ánh code THỰC TẾ: chỉ demo có backend chạy được mới lên sidebar;
// demo còn lại chỉ nằm ở Roadmap trên Workspace Home, không có route, không có nút Run.
export type Demo = {
  id: string;
  title: string;
  route: string;
  implemented: boolean;
  mechanism: string; // Một câu: demo này giải thích cơ chế gì.
  scenarios: string[]; // Scenario đã chạy được (với demo đã implement) hoặc dự kiến.
  plannedScenarios?: string[]; // Scenario của demo đã implement nhưng chưa làm.
};

export const DEMOS: Demo[] = [
  {
    id: "01", title: "Agent Runtime", route: "/runtime", implemented: true,
    mechanism: "POST → asyncio Task → emit → Queue → SSE → React; Future chờ Approve/Reject; Task.cancel() ở backend.",
    scenarios: ["SSE", "Approval / Reject", "Cancel"],
  },
  {
    id: "02", title: "Claude API", route: "/claude-api", implemented: true,
    mechanism: "Một lần gọi messages.create thật: request, response, stop_reason, usage, latency.",
    scenarios: ["One-shot"],
    plannedScenarios: ["History On/Off", "Streaming", "API Behavior"],
  },
  {
    id: "03", title: "Tool Calling & Registry", route: "/tools", implemented: false,
    mechanism: "Claude yêu cầu tool, Python thực thi qua registry và trả tool_result.",
    scenarios: ["Single Tool", "Registry", "Tool Error", "Multiple Tools"],
  },
  {
    id: "04", title: "Manual Agent Loop", route: "/manual-agent", implemented: false,
    mechanism: "Tự viết loop messages.create → tool_use → tool_result, có stop condition và rollback history.",
    scenarios: ["Normal", "Max Turns", "Tool Failure", "Cancel/Rollback", "Context"],
  },
  {
    id: "05", title: "Structured Output", route: "/structured-output", implemented: false,
    mechanism: "JSON có schema, validation nghiệp vụ và repair có giới hạn.",
    scenarios: ["Typed Output", "Schema Validation", "Semantic/Evidence", "Repair"],
  },
  {
    id: "06", title: "Agent Workflows", route: "/workflows", implemented: false,
    mechanism: "So sánh năm pattern: chaining, routing, parallel, orchestrator, evaluator.",
    scenarios: ["Chaining", "Routing", "Parallel", "Orchestrator", "Evaluator"],
  },
  {
    id: "07", title: "MCP", route: "/mcp", implemented: false,
    mechanism: "MCP server/client thật: list tools, call tool, resources, prompts.",
    scenarios: ["Connect/Discover", "Invoke", "Resources/Prompts", "Agent+MCP"],
  },
  {
    id: "08", title: "Claude Agent SDK", route: "/agent-sdk", implemented: false,
    mechanism: "SDK quản lý loop; app vẫn quản lý session, permissions, persistence.",
    scenarios: ["Basic", "Sessions/Streaming", "Permissions/Hooks", "Skills", "Subagents", "Final Task Agent"],
  },
];

export const LIVE_DEMOS = DEMOS.filter((demo) => demo.implemented);
export const ROADMAP_DEMOS = DEMOS.filter((demo) => !demo.implemented);
