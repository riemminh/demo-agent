// Nội dung tĩnh của Demo 03: scenario, prompt mẫu, breakpoint, kết quả cần đạt.
import type { ScenarioName } from "./api";

export type Scenario = {
  label: string;
  backend: ScenarioName;
  description: string;
  toolsSent: string;
  toolChoice: string;
  presets: string[];
};

export const SCENARIOS: Record<ScenarioName, Scenario> = {
  single: {
    label: "Single Tool", backend: "single",
    description: "Một tool round đầy đủ: Claude xin gọi sum_numbers, Python tính, gửi tool_result, Claude chốt câu trả lời.",
    toolsSent: "sum_numbers", toolChoice: 'tool_choice = {"type":"tool","name":"sum_numbers"} (ép để thấy protocol)',
    presets: ["Tính tổng 120000 + 85000 + 45000", "Tổng của 7, 13.5 và 29 là bao nhiêu?"],
  },
  registry: {
    label: "Registry", backend: "registry",
    description: "Gửi cả ba tool, tool_choice = auto: model TỰ chọn tên tool, Python dispatch theo tên trong registry.",
    toolsSent: "sum_numbers · count_words · divide_numbers", toolChoice: "tool_choice = auto (quyết định thật của model)",
    presets: [
      'Đếm số từ trong câu này: "Claude chọn tool, Python thực thi tool".',
      "Tính tổng 120000 + 85000 + 45000 giúp tôi.",
      "Thủ đô của Việt Nam là gì?",
    ],
  },
  error: {
    label: "Tool Error", backend: "error",
    description: "Tool raise lỗi thật (ZeroDivisionError). Lỗi được trả về Claude như DỮ LIỆU với is_error=true, không làm sập API.",
    toolsSent: "divide_numbers", toolChoice: 'tool_choice = {"type":"tool","name":"divide_numbers"}',
    presets: ["Chia 10 cho 0 bằng tool divide_numbers.", "Chia 10 cho 4 bằng tool divide_numbers."],
  },
};

export const SCENARIO_KEYS = Object.keys(SCENARIOS) as ScenarioName[];

// `code` là đoạn code có thật trong file (Ctrl+F được).
export const BREAKPOINTS = [
  {
    file: "backend/demos/demo_03_tools/tools.py", fn: "TOOL_SCHEMAS",
    code: '"name": "sum_numbers",',
    why: "Schema chỉ là LỜI MÔ TẢ gửi cho model (name + description + input_schema). Model đọc mô tả này để biết có tool gì, nhưng nó không chạy được code.",
  },
  {
    file: "backend/demos/demo_03_tools/tool_calling.py", fn: "run_tool_round()",
    code: "tool_uses = [block for block in first.content if block.type == \"tool_use\"]",
    why: "Response #1 có thể chứa cả block `text` và `tool_use`. Không có `tool_use` nào thì demo báo `no_tool_use` chứ không dựng tool giả.",
  },
  {
    file: "backend/demos/demo_03_tools/registry.py", fn: "execute()",
    code: "value = function(**validated.model_dump())",
    why: "Đây mới là chỗ Python THỰC THI tool: tra dict `TOOL_REGISTRY` theo tên, validate input bằng Pydantic rồi gọi hàm. Không eval/exec, tool lạ bị chặn ngay.",
  },
  {
    file: "backend/demos/demo_03_tools/tool_calling.py", fn: "run_tool_round()",
    code: '"type": "tool_result", "tool_use_id": block.id,',
    why: "Request #2 phải gồm nguyên văn block `tool_use` của assistant, rồi `tool_result` của user với `tool_use_id` khớp. Lỗi tool đi kèm `is_error=true`.",
  },
];
