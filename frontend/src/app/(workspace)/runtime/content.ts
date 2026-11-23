// Nội dung của demo 01 · Agent Runtime: scenario, breakpoint, kết quả cần đạt.
import type { OutcomeItem } from "@/components/LearningOutcome";
import type { BackendScenario } from "./runtime-api";

export type ScenarioKey = "sse" | "approval" | "cancel";

export type Scenario = {
  label: string;
  backend: BackendScenario; // Scenario "cancel" chạy kịch bản "long" của agent.py.
  startLabel: string;
  preset: string; // Câu mẫu mặc định; người xem sửa được.
  description: string;
  try: string;
  expectedFlow: string;
  note?: string; // Giới hạn hiện tại cần nói rõ khi trình bày.
};

export const SCENARIOS: Record<ScenarioKey, Scenario> = {
  sse: {
    label: "SSE", backend: "sse", startLabel: "Start SSE", preset: "Why HTTP 429?",
    description: "Agent chạy trong asyncio Task, emit event vào Queue; endpoint đọc Queue và yield từng khung SSE.",
    try: "Bấm Start SSE, nhìn text_delta đến từng đợt trong Live text và Execution Events.",
    expectedFlow: "run_started → tool_call → tool_result → text_delta ×4 → final → run_finished",
  },
  approval: {
    label: "Approval / Reject", backend: "approval", startLabel: "Start Approval",
    preset: "Please create a support ticket",
    description: "Agent dừng ở await Future trong ApprovalBroker; một request HTTP khác (Approve/Reject) đánh thức nó.",
    try: "Start Approval → Approve hoặc Reject. Thử thêm: Start Approval → Cancel khi đang chờ.",
    expectedFlow: "approval_required → approval_decision → permission(allow|deny) → tool_result → final → run_finished",
    note: "Tool create_ticket_draft vẫn mô phỏng (asyncio.sleep), chưa ghi dữ liệu thật. Phase B đổi sang task SQLite/file sandbox có read-back.",
  },
  cancel: {
    label: "Cancel", backend: "long", startLabel: "Start Long Running (12s)", preset: "Run 20 long steps",
    description: "Task.cancel() ở backend làm điểm await đang chờ trong agent raise CancelledError.",
    try: "Start Long Running, đợi vài bước rồi bấm Cancel Agent.",
    expectedFlow: "progress ×n → error(kind=cancelled) → run_finished (không có final)",
  },
};

export const SCENARIO_KEYS = Object.keys(SCENARIOS) as ScenarioKey[];

export function parseScenario(value: string | null): ScenarioKey {
  return SCENARIO_KEYS.includes(value as ScenarioKey) ? (value as ScenarioKey) : "sse";
}

// `code` là đoạn code có thật trong file (Ctrl+F được), không ghi số dòng để khỏi lệch khi sửa file.
export const BREAKPOINTS = [
  { file: "backend/api.py", fn: "send_message()", code: "session.task = asyncio.create_task(",
    why: "POST trả về StreamingResponse ngay; Agent chạy riêng trong Task. Đặt thêm ở `event = await queue.get()` để thấy consumer chờ event." },
  { file: "backend/approvals.py", fn: "ApprovalBroker.request()", code: "approved = await asyncio.wait_for(future, timeout=self.timeout_seconds)",
    why: "Agent dừng ở đây cho tới khi resolve() gọi future.set_result(approved) từ request /approvals." },
  { file: "backend/api.py", fn: "cancel_agent()", code: "session.task.cancel()",
    why: "Hủy Task ở backend. Sau đó run_turn() vào nhánh except asyncio.CancelledError và không commit history." },
  { file: "frontend/src/app/(workspace)/runtime/runtime-api.ts", fn: "streamMessage()", code: "const { value, done } = await reader.read();",
    why: "Browser nhận chunk SSE, tách khung `data: ...` rồi gọi onEvent → handleEvent() cập nhật React state." },
];

export const OUTCOMES: OutcomeItem[] = [
  { text: "Giải thích được POST → asyncio.create_task → emit → Queue → StreamingResponse → reader.read() → React state." },
  { text: "Hiểu vì sao Agent phải await Future, và vì sao Approve/Reject đi bằng một request khác rồi resolve Future đó." },
  { text: "Cancel tác động vào Task ở backend (có event error kind=cancelled); đóng tab hay rời trang chỉ đóng stream, Task vẫn chạy." },
  { text: "History của session chỉ được commit khi run kết thúc bình thường, run bị cancel thì không." },
];
