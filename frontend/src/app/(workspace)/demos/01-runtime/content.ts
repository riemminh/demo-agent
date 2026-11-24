// Nội dung tĩnh của Demo 01: scenario, breakpoint, kết quả cần đạt.
import type { BackendScenario } from "./api";

export type ScenarioKey = "sse" | "approval" | "cancel";

export type Scenario = {
  label: string;
  backend: BackendScenario; // Scenario "cancel" chạy kịch bản "long" của runtime.py.
  startLabel: string;
  preset: string; // Câu mẫu mặc định; người xem sửa được.
  description: string;
  try: string;
  expectedFlow: string;
};

export const SCENARIOS: Record<ScenarioKey, Scenario> = {
  sse: {
    label: "SSE", backend: "sse", startLabel: "Start SSE", preset: "Why HTTP 429?",
    description: "Agent chạy trong asyncio Task, emit event vào Queue; endpoint đọc Queue và yield từng khung SSE.",
    try: "Bấm Start SSE rồi nhìn text_delta đến từng đợt, trước khi có final.",
    expectedFlow: "run_started → tool_call → tool_result → text_delta ×4 → final → run_finished",
  },
  approval: {
    label: "Approval", backend: "approval", startLabel: "Start Approval",
    preset: "Ghi note cho buổi sharing Team 1",
    description: "Agent dừng ở await Future trong ApprovalBroker. Approve thì backend ghi file thật, Reject thì không ghi gì.",
    try: "Start Approval → Approve (file xuất hiện) rồi Reset file → Start Approval → Reject (file không được tạo).",
    expectedFlow: "tool_call → approval_required → approval_decision → permission(allow|deny) → tool_result → final → run_finished",
  },
  cancel: {
    label: "Cancel", backend: "long", startLabel: "Start Long Running (12s)",
    preset: "Run 20 long steps",
    description: "Task.cancel() ở backend làm điểm await đang chờ trong agent raise CancelledError.",
    try: "Start Long Running, đợi vài bước rồi bấm Cancel Agent. Thử thêm: Start Approval → Cancel khi đang chờ.",
    expectedFlow: "progress ×n → error(kind=cancelled) → run_finished (không có final)",
  },
};

export const SCENARIO_KEYS = Object.keys(SCENARIOS) as ScenarioKey[];

// `code` là đoạn code có thật trong file (Ctrl+F được), không ghi số dòng để khỏi lệch khi sửa file.
export const BREAKPOINTS = [
  {
    file: "backend/demos/demo_01_runtime/router.py", fn: "start_run()",
    code: "task = asyncio.create_task(run_turn(session, body.text, queue, body.scenario))",
    why: "Handler KHÔNG await agent: nó trả StreamingResponse ngay, agent chạy trong Task riêng. Đặt thêm breakpoint ở `await asyncio.wait_for(queue.get(), ...)` để thấy consumer chờ từng event.",
  },
  {
    file: "backend/demos/demo_01_runtime/runtime.py", fn: "run_turn() → emit()",
    code: "queue.put_nowait(event)",
    why: "Producer: mỗi event agent emit đi vào Queue của đúng run đó, rồi mới thành khung `data: {...}` của SSE.",
  },
  {
    file: "backend/shared/approval.py", fn: "ApprovalBroker.request()",
    code: "approved = await asyncio.wait_for(future, timeout=self.timeout_seconds)",
    why: "Agent dừng tại đây tới khi `resolve()` gọi `future.set_result(approved)` từ request POST /approvals, hoặc hết 120s thì fail closed (reject).",
  },
  {
    file: "backend/demos/demo_01_runtime/router.py", fn: "cancel_run()",
    code: "session.task.cancel()",
    why: "Hủy Task ở backend. Sau đó `run_turn()` vào nhánh `except asyncio.CancelledError`, emit error(kind=cancelled) và KHÔNG commit history.",
  },
  {
    file: "frontend/src/app/(workspace)/demos/01-runtime/api.ts", fn: "startRun()",
    code: "const { value, done } = await reader.read();",
    why: "Browser nhận chunk SSE, tách khung `data: ...` rồi gọi onEvent → handleEvent() cập nhật React state.",
  },
];
