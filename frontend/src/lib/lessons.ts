// Metadata navigation của Workspace (Plan V3). Status phản ánh implementation THỰC TẾ:
// - completed: đạt Definition of Done của Plan V3 (mục F) và đã verify (live với feature Live).
// - available: route chạy được nhưng chưa đạt đủ DoD V3 hoặc là demo legacy chưa reconcile.
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
  outcome: string; // "Kết quả cần đạt" của module (Plan V3, mục C).
  lessons: Lesson[];
};

const soon = (id: string, title: string, mode: Lesson["mode"]): Lesson =>
  ({ id, title, mode, status: "coming_soon" });

export const MODULES: Module[] = [
  {
    id: "m1", title: "Runtime Foundation",
    outcome: "Tự giải thích được POST → create_task → emit → queue → SSE → UI, ApprovalBroker và Cancel, với state/file kiểm chứng được trên UI.",
    lessons: [
      { id: "01", title: "SSE Streaming", mode: "Offline", status: "available", route: "/",
        note: "Demo legacy, đã smoke test; chưa chuyển sang Runtime Lab." },
      soon("02", "Session Management", "Offline"),
      soon("03", "Async Task Management", "Offline"),
      { id: "04", title: "Human Approval", mode: "Offline", status: "available", route: "/approval",
        note: "Demo legacy: tool create_ticket_draft còn mô phỏng; Pass B đổi sang ghi file sandbox thật." },
      { id: "05", title: "Cancel Agent", mode: "Offline", status: "available", route: "/approval",
        note: "Demo legacy (Long Running + Cancel) trong trang /approval." },
    ],
  },
  {
    id: "m2", title: "Claude API",
    outcome: "Chạy Claude thật với dữ liệu mình nhập, xem output và request/response; hiểu history, streaming, stop reason, token, caching, retry mà chưa dùng Agent framework.",
    lessons: [
      { id: "06", title: "One-shot Message", mode: "Live", status: "available", route: "/lessons/messages-api",
        note: "Generate Task Description / Leave Email, Claude thật 1 request." },
      soon("07", "Multi-turn Conversation", "Live"),
      soon("08", "Claude Streaming", "Live"),
      soon("09", "Stop Reason", "Live"),
      soon("10", "Token Counting", "Live"),
      soon("11", "API Error & Retry", "Hybrid"),
      soon("12", "Prompt Caching", "Live"),
    ],
  },
  {
    id: "m3", title: "Tool Playground",
    outcome: "Tự tạo tool Python có schema, dispatch, permission; chứng minh thành công bằng calculator, file hoặc SQLite thật.",
    lessons: [soon("13", "Single Tool Calling", "Live"), soon("14", "Schema & Registry", "Hybrid"),
      soon("15", "Multiple & Parallel Tools", "Live"), soon("16", "Tool Error Recovery", "Hybrid"),
      soon("17", "Tool Policy & Approval", "Hybrid")],
  },
  {
    id: "m4", title: "Manual Agent",
    outcome: "Tự xây Agent Loop hữu hạn có tools, SSE, approval, history và context; biết điểm nào model quyết định, điểm nào code quyết định.",
    lessons: [soon("18", "Basic Agent Loop", "Live"), soon("19", "Agent State/Rollback", "Hybrid"),
      soon("20", "Context Management", "Hybrid")],
  },
  {
    id: "m5", title: "Validation Studio",
    outcome: "Bảo vệ application khỏi output sai kiểu, vô lý hoặc bịa nguồn; kết quả chưa validated không được tạo task thật.",
    lessons: [soon("21", "Native Structured Output", "Live"), soon("22", "Schema & Semantic", "Offline"),
      soon("23", "Evidence & Repair", "Hybrid")],
  },
  {
    id: "m6", title: "Workflow Lab",
    outcome: "Phân biệt Agent với fixed workflow, dùng đúng pattern cho Task Manager và giải thích bằng số calls/step và output thật.",
    lessons: [soon("24", "Prompt Chaining", "Live"), soon("25", "Routing", "Live"),
      soon("26", "Parallelization", "Live"), soon("27", "Orchestrator–Workers", "Live"),
      soon("28", "Evaluator–Optimizer", "Live")],
  },
  {
    id: "m7", title: "MCP Explorer",
    outcome: "Chứng minh MCP server độc lập Claude; Agent gọi MCP thật, mọi write vẫn bị policy/approval server-side kiểm soát.",
    lessons: [soon("29", "MCP Server & Client", "Offline"), soon("30", "Primitives & Transport", "Offline"),
      soon("31", "Claude + MCP", "Live")],
  },
  {
    id: "m8", title: "SDK Task Agent",
    outcome: "Tự xây SDK Agent Task Manager có tools, sessions, hooks, approval, skills, subagents; giải thích phần SDK đảm nhận và phần developer kiểm soát.",
    lessons: [soon("32", "Basic Agent SDK", "Live"), soon("33", "SDK Session/Streaming", "Live"),
      soon("34", "Hooks/Permissions", "Live"), soon("35", "Skills", "Live"), soon("36", "Subagents", "Live")],
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
