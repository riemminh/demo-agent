// Nội dung tĩnh của Demo 08: scenario, breakpoint, kết quả cần đạt.
import type { ScenarioName } from "./api";

export type Scenario = {
  label: string;
  description: string;
  watch: string;
};

export const SCENARIOS: Record<ScenarioName, Scenario> = {
  basic: {
    label: "Basic",
    description: "SDK giữ vòng lặp: mình chỉ cấp options rồi đọc message SDK trả về. Không có loop nào do mình viết.",
    watch: "options_built → sdk_connected (CLI version, pid) → message của SDK → result (num_turns, cost).",
  },
  permissions: {
    label: "Permissions & Hooks",
    description: "can_use_tool được SDK gọi TRƯỚC khi chạy tool. Tool đọc thì tự cho qua; tool ghi thì chờ bạn quyết định. Hook quan sát chạy song song.",
    watch: "hook_fired (payload thật của SDK) · permission_requested → bạn Approve/Reject → permission_decided; Reject thì không có row nào vào SQLite.",
  },
  skills: {
    label: "Skills",
    description: "Skill là file SKILL.md trong sandbox của demo, bật qua option skills + tool Skill. SDK tự quyết định có dùng hay không.",
    watch: "Inspect cho thấy skills=['task-planning']. Việc skill có được kích hoạt hay không chỉ kết luận được khi có lượt model thật.",
  },
  subagents: {
    label: "Subagents",
    description: "App khai báo hai AgentDefinition; SDK đăng ký chúng và chỉ delegate khi nó thấy cần, qua tool Task.",
    watch: "Inspect: subagents_registered = ['requirements-analyst', 'task-planner']. Trace chỉ báo delegation khi thực sự có tool_use Task.",
  },
};

export const SCENARIO_KEYS = Object.keys(SCENARIOS) as ScenarioName[];

export const BREAKPOINTS = [
  {
    file: "backend/demos/demo_08_agent_sdk/sdk_agent.py", fn: "run_query()",
    code: "async for message in client.receive_response():",
    why: "SDK quản lý vòng lặp; code chỉ nhận message (AssistantMessage, ToolUseBlock, ResultMessage…) và dịch thành event. So với Demo 04: ở đó `for turn in range(max_turns)` là của mình.",
  },
  {
    file: "backend/demos/demo_08_agent_sdk/customization.py", fn: "permission_callback()",
    code: "return PermissionResultDeny(message=\"Người dùng từ chối ghi dữ liệu.\")",
    why: "Deny là chặn THẬT ở tầng SDK: tool không được chạy, không phải chỉ ẩn nút trên UI. Tool chỉ đọc thì trả Allow ngay, không làm phiền người dùng.",
  },
  {
    file: "backend/demos/demo_08_agent_sdk/customization.py", fn: "hook_matchers()",
    code: 'emit({"type": "hook_fired",',
    why: "Hook là kênh QUAN SÁT: payload (hook_event_name, prompt, session_id) do SDK đưa vào. Nó không thay thế can_use_tool — quyền chặn vẫn nằm ở permission callback.",
  },
  {
    file: "backend/demos/demo_08_agent_sdk/customization.py", fn: "build_options()",
    code: "setting_sources=[],  # KHÔNG nạp settings/plugin cá nhân",
    why: "Không có dòng này thì CLI nạp skill/plugin trong máy người chạy (đã quan sát: skill-creator, plugin Postman) và demo sẽ không còn tái lập được.",
  },
];
