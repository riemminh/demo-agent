// Metadata navigation của Playground V2. Status phản ánh implementation THỰC TẾ:
// - completed: đã implement theo Plan V2 và đã verify (offline/live tương ứng).
// - available: route chạy được nhưng chưa verify đủ hoặc là demo legacy chưa reconcile.
// - coming_soon: chưa implement, không có route, không có nút Run.
export type LessonStatus = "completed" | "available" | "coming_soon";

export type Lesson = {
  id: string;
  title: string;
  mode: "Offline" | "Live" | "Hybrid";
  status: LessonStatus;
  route?: string;
  note?: string;
};

export type Module = {
  id: string;
  title: string;
  outcome: string; // "Kết quả cần đạt" của module (Plan V2, mục 7 / 8).
  lessons: Lesson[];
};

const soon = (id: string, title: string, mode: Lesson["mode"]): Lesson =>
  ({ id, title, mode, status: "coming_soon" });

export const MODULES: Module[] = [
  {
    id: "m1", title: "Runtime Foundation",
    outcome: "Giải thích độc lập vòng đời request, session, task, SSE, approval và cancel; phân biệt trạng thái hiển thị với dữ liệu đã ghi.",
    lessons: [
      { id: "01", title: "Agent SSE Streaming", mode: "Offline", status: "available", route: "/",
        note: "Demo legacy, đã smoke test; chưa reconcile đủ UI theo Plan V2." },
      soon("02", "Session Management", "Offline"),
      soon("03", "Async Task Management", "Offline"),
      { id: "04", title: "Human-in-the-loop Approval", mode: "Offline", status: "available", route: "/approval",
        note: "Demo legacy: tool giả lập, chưa ghi file thật theo Plan V2." },
      { id: "05", title: "Cancel Agent", mode: "Offline", status: "available", route: "/approval",
        note: "Demo legacy (Long Running + Cancel) trong trang /approval." },
    ],
  },
  {
    id: "m2", title: "Claude API Mechanics",
    outcome: "Tự gọi Claude, đọc request/response, history, streaming, stop reason, usage, lỗi và cache; chưa cần Agent framework.",
    lessons: [
      { id: "06", title: "Basic Messages API", mode: "Live", status: "available", route: "/lessons/messages-api",
        note: "Live verification pending." },
      soon("07", "Multi-turn Conversation", "Live"),
      soon("08", "Claude Streaming", "Live"),
      soon("09", "Stop Reason", "Live"),
      soon("10", "Token Counting & Usage", "Live"),
      soon("11", "API Errors & Retry", "Hybrid"),
      soon("12", "Prompt Caching", "Live"),
    ],
  },
  {
    id: "m3", title: "Tool Calling & Implementation",
    outcome: "Tự định nghĩa, validate và dispatch tool, hiểu tool_use_id, chạy đồng thời, xử lý lỗi và kiểm soát quyền trước side effect.",
    lessons: [soon("13", "Single Tool Calling", "Live"), soon("14", "Tool Schema & Registry", "Hybrid"),
      soon("15", "Multiple & Parallel Tools", "Live"), soon("16", "Tool Error & Recovery", "Hybrid"),
      soon("17", "Tool Policy & Approval", "Hybrid")],
  },
  {
    id: "m4", title: "Manual Agent Architecture",
    outcome: "Tự viết vòng lặp hữu hạn, quản lý history/context, biết model quyết định gì và code kiểm soát gì.",
    lessons: [soon("18", "Basic Manual Agent Loop", "Live"), soon("19", "Agent State & History Rollback", "Hybrid"),
      soon("20", "Context Management", "Hybrid")],
  },
  {
    id: "m5", title: "Structured Output & Validation",
    outcome: "Biến văn bản tự nhiên thành dữ liệu typed; kiểm tra schema, business rules, evidence và repair có giới hạn.",
    lessons: [soon("21", "Native Structured Output", "Live"), soon("22", "Schema & Semantic Validation", "Offline"),
      soon("23", "Evidence Validation & Repair", "Hybrid")],
  },
  {
    id: "m6", title: "Agent Patterns & Workflows",
    outcome: "Phân biệt workflow cố định, routing, concurrency, dynamic planning, evaluator loop; chọn pattern theo yêu cầu, cost và latency.",
    lessons: [soon("24", "Prompt Chaining", "Live"), soon("25", "Routing", "Live"),
      soon("26", "Parallelization — Sectioning & Voting", "Live"), soon("27", "Orchestrator–Workers", "Live"),
      soon("28", "Evaluator–Optimizer", "Live")],
  },
  {
    id: "m7", title: "MCP Development",
    outcome: "Tự chạy server/client, khám phá primitives, hiểu transport và tích hợp cùng business tools thật.",
    lessons: [soon("29", "Basic MCP Server & Client", "Offline"), soon("30", "MCP Primitives & Transport", "Offline"),
      soon("31", "Claude Agent + MCP", "Live")],
  },
  {
    id: "m8", title: "Claude Agent SDK & Customization",
    outcome: "Hiểu SDK thay phần loop nào, ứng dụng vẫn kiểm soát state, validation, callback, tools, permissions, skills và subagents.",
    lessons: [soon("32", "Basic Agent SDK", "Live"), soon("33", "SDK Session & Streaming", "Live"),
      soon("34", "Hooks & Permissions", "Live"), soon("35", "Agent Skills", "Live"), soon("36", "Subagents", "Live")],
  },
];

export const ENGINEERING_OUTCOME =
  "Giải thích vì sao kiến trúc phải xuất phát từ requirements; phân biệt demo cục bộ với production; biết app layer vẫn cần state, policy, validation, observability dù dùng SDK.";

// color: preset của antd Tag; dot: màu Badge trong sidebar (tĩnh, không nhấp nháy khi trình chiếu).
export const STATUS_TAG: Record<LessonStatus, { color: string; dot: string; label: string }> = {
  completed: { color: "success", dot: "#087F76", label: "Completed" },
  available: { color: "processing", dot: "#2459A6", label: "Available" },
  coming_soon: { color: "default", dot: "#BFC7D2", label: "Coming Soon" },
};

export const ALL_LESSONS: Lesson[] = MODULES.flatMap((module) => module.lessons);
