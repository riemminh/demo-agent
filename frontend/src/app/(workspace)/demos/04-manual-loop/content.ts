// Nội dung tĩnh của Demo 04: scenario, breakpoint, kết quả cần đạt.

export type ScenarioKey =
  | "normal"
  | "max-turns"
  | "failure"
  | "structured"
  | "rules"
  | "skills"
  | "permissions"
  | "subagents";

export type Scenario = {
  label: string;
  maxTurns: number;
  prompt: string;
  description: string;
  expect: string;
  learning: string;
};

export const SCENARIOS: Record<ScenarioKey, Scenario> = {
  normal: {
    label: "Normal", maxTurns: 4,
    prompt: 'Kiểm tra danh sách task. Nếu chưa có task "Login", hãy tạo task "Login" priority high. Trả lời ngắn khi xong.',
    description: "Loop chạy nhiều lượt: model gọi list_tasks, rồi xin create_task (cần bạn Approve), rồi mới chốt câu trả lời.",
    expect: "list_tasks → approval_required → Approve → INSERT thật → end_turn → history_committed",
    learning: "Vòng lặp do Python giữ; approval nằm trong execute_tool trước khi INSERT.",
  },
  "max-turns": {
    label: "Max Turns", maxTurns: 1,
    prompt: 'Kiểm tra danh sách task. Nếu chưa có task "Login", hãy tạo task "Login" priority high. Trả lời ngắn khi xong.',
    description: "Giới hạn 1 lượt cho một việc cần nhiều lượt: hết lượt mà chưa có câu trả lời cuối thì báo max_turns_reached.",
    expect: "turn 1 dùng tool → hết lượt → max_turns_reached, KHÔNG có final, history không commit",
    learning: "MAX_TURNS là giới hạn an toàn — không đồng nghĩa output đủ bước.",
  },
  failure: {
    label: "Tool Failure", maxTurns: 4,
    prompt: "Dùng get_task để đọc task id 999999 rồi cho tôi biết kết quả.",
    description: "Tool đọc một id không tồn tại: tool_result mang is_error=true, model đọc lỗi đó rồi giải thích.",
    expect: "tool_result(is_error=true, TaskNotFound) → model giải thích → end_turn",
    learning: "Lỗi tool là dữ liệu cho model, không phải exception làm sập loop.",
  },
  structured: {
    label: "Loop + Structured", maxTurns: 4,
    prompt: 'Kiểm tra danh sách task. Nếu chưa có task "Login", hãy tạo task "Login" priority high. '
      + 'Khi xong, câu trả lời CUỐI chỉ là JSON TaskDraft (estimated_hours là số, ví dụ 8): '
      + '{"title":"Login","priority":"high","estimated_hours":8}',
    description: "Giống Normal nhưng chỉ commit history khi câu trả lời cuối pass Pydantic + semantic (Demo 05).",
    expect: "tool như Normal → end_turn → structured_validate (repair nếu fail) → accepted → history_committed",
    learning: "Điều kiện dừng có thể là schema/semantic, không chỉ end_turn.",
  },
  rules: {
    label: "Rules Loading", maxTurns: 4,
    prompt: "Theo rules đã nạp, tóm tắt chính sách tạo task (3 ý). Gọi list_tasks nếu cần ví dụ.",
    description: "Python đọc CLAUDE.md + .claude/rules/*.md và ghép vào system prompt trước messages.create — không dùng SDK.",
    expect: "rules_loaded → system_prompt_sent → model trả lời phản ánh task-policy",
    learning: "Developer tự nạp Rules từ filesystem; UI thấy file và system prompt thật được gửi.",
  },
  skills: {
    label: "Skills (Progressive)", maxTurns: 5,
    prompt: "Lập kế hoạch cho việc thêm 2FA vào trang đăng nhập.",
    description: "Chỉ đưa metadata skill vào system; model gọi load_skill để nạp SKILL.md khi cần (cùng skill task-planning với Demo 08).",
    expect: "skills_discovered → load_skill → skill_merged_into_system → list_tasks → skill_tools_cleared → final",
    learning: "Progressive disclosure + Python giữ lane: merge SKILL vào system, gỡ tool để tránh loop load/list.",
  },
  permissions: {
    label: "Permissions", maxTurns: 4,
    prompt: 'Kiểm tra danh sách task. Nếu chưa có task "Login", hãy tạo task "Login" priority high. Trả lời ngắn khi xong.',
    description: "permissions.py phân loại tool trước khi chạy: đọc auto-allow, ghi chờ approval, lạ deny — cùng prompt Login với Demo 08.",
    expect: "permission_requested/decided → Approve mới INSERT · Reject/timeout không ghi",
    learning: "Enforcement ở Python (check_tool_permission), không chỉ dựa vào Rules trong prompt.",
  },
  subagents: {
    label: "Subagents", maxTurns: 5,
    prompt: "Phân tích yêu cầu trong requirements.md rồi lập kế hoạch ngắn.",
    description: "Main agent có delegate_task; mỗi subagent loop riêng, context tách, không delegation đệ quy.",
    expect: "read_file → requirements_merged → 2× delegate → subagent_tools_cleared → final",
    learning: "Chỉ tool_result tóm tắt quay về main — không copy full history subagent.",
  },
};

export const SCENARIO_KEYS = Object.keys(SCENARIOS) as ScenarioKey[];

export const BREAKPOINTS = [
  {
    file: "backend/demos/demo_04_manual_loop/rules.py", fn: "load_rules_bundle()",
    code: 'emit({"type": "rules_loaded"',
    why: "Đọc `CLAUDE.md` và `.claude/rules/` rồi ghép vào `system` của messages.create.",
  },
  {
    file: "backend/demos/demo_04_manual_loop/skills.py", fn: "load_skill_content()",
    code: 'emit({"type": "skill_loaded"',
    why: "Progressive disclosure: discover chỉ name/description; nội dung SKILL qua tool_result.",
  },
  {
    file: "backend/demos/demo_04_manual_loop/permissions.py", fn: "check_tool_permission()",
    code: 'emit({"type": "permission_decided"',
    why: "Phân loại Read/Write/Unknown trước execute — so với Demo 08 `can_use_tool` của SDK.",
  },
  {
    file: "backend/demos/demo_04_manual_loop/subagent_loop.py", fn: "run_subagent()",
    code: 'emit({"type": "subagent_started"',
    why: "Subagent có system + messages riêng; main chỉ nhận kết quả rút gọn qua delegate_task.",
  },
  {
    file: "backend/demos/demo_04_manual_loop/agent_loop.py", fn: "run_loop()",
    code: "session.history = working",
    why: "Vẫn chỉ commit khi end_turn hợp lệ; working_messages tách khỏi session đã commit.",
  },
];