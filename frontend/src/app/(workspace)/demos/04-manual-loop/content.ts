// Nội dung tĩnh của Demo 04: scenario, breakpoint, kết quả cần đạt.
import type { OutcomeItem } from "@/components/LearningOutcome";

export type ScenarioKey = "normal" | "max-turns" | "failure";

export type Scenario = {
  label: string;
  maxTurns: number;
  prompt: string;
  description: string;
  expect: string;
};

export const SCENARIOS: Record<ScenarioKey, Scenario> = {
  normal: {
    label: "Normal", maxTurns: 4,
    prompt: 'Kiểm tra danh sách task. Nếu chưa có task "Login", hãy tạo task "Login" priority high. Trả lời ngắn khi xong.',
    description: "Loop chạy nhiều lượt: model gọi list_tasks, rồi xin create_task (cần bạn Approve), rồi mới chốt câu trả lời.",
    expect: "list_tasks → approval_required → Approve → INSERT thật → end_turn → history_committed",
  },
  "max-turns": {
    label: "Max Turns", maxTurns: 1,
    prompt: 'Kiểm tra danh sách task. Nếu chưa có task "Login", hãy tạo task "Login" priority high. Trả lời ngắn khi xong.',
    description: "Giới hạn 1 lượt cho một việc cần nhiều lượt: hết lượt mà chưa có câu trả lời cuối thì báo max_turns_reached.",
    expect: "turn 1 dùng tool → hết lượt → max_turns_reached, KHÔNG có final, history không commit",
  },
  failure: {
    label: "Tool Failure", maxTurns: 4,
    prompt: "Dùng get_task để đọc task id 999999 rồi cho tôi biết kết quả.",
    description: "Tool đọc một id không tồn tại: tool_result mang is_error=true, model đọc lỗi đó rồi giải thích.",
    expect: "tool_result(is_error=true, TaskNotFound) → model giải thích → end_turn",
  },
};

export const SCENARIO_KEYS = Object.keys(SCENARIOS) as ScenarioKey[];

// `code` là đoạn code có thật trong file (Ctrl+F được).
export const BREAKPOINTS = [
  {
    file: "backend/demos/demo_04_manual_loop/agent_loop.py", fn: "run_loop()",
    code: "working = copy.deepcopy(session.history)",
    why: "`working_messages` là bản copy. Run này fail/cancel thì `session.history` (đã commit) vẫn nguyên vẹn.",
  },
  {
    file: "backend/demos/demo_04_manual_loop/agent_loop.py", fn: "run_loop()",
    code: "for turn in range(1, max_turns + 1):",
    why: "Python giữ vòng lặp, model chỉ quyết định `stop_reason`. Mỗi lượt là MỘT request Claude; `messages_in_request` tăng dần vì history nối thêm assistant + tool_result.",
  },
  {
    file: "backend/demos/demo_04_manual_loop/tasks_tools.py", fn: "execute_tool()",
    code: "approved = await approver(name, validated.model_dump())",
    why: "Tool ghi dữ liệu thì dừng ở đây chờ người duyệt. Không approve → không INSERT (fail closed).",
  },
  {
    file: "backend/demos/demo_04_manual_loop/agent_loop.py", fn: "run_loop()",
    code: "session.history = working  # COMMIT",
    why: "Chỉ nhánh `end_turn` + có text mới commit. `max_tokens`/`refusal`/hết lượt đều KHÔNG được nhận làm final.",
  },
];

export const OUTCOMES: OutcomeItem[] = [
  { text: "Mô tả được vòng lặp Claude → tool_use → Python execute → tool_result → Claude, lặp tới khi stop_reason = end_turn." },
  { text: "Giải thích vì sao cần MAX_TURNS và validate stop_reason: hết lượt là một trạng thái thất bại rõ ràng, không được coi là xong." },
  { text: "Phân biệt rollback hội thoại (working_messages không commit) với rollback side effect (task đã INSERT vào SQLite thì vẫn còn đó)." },
];
