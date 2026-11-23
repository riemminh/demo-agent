// Nội dung tĩnh của Demo 02: scenario, preset prompt, breakpoint, kết quả cần đạt.
import type { OutcomeItem } from "@/components/LearningOutcome";

export type ScenarioKey = "one-shot" | "history" | "streaming";

export type Scenario = {
  label: string;
  streaming: boolean;
  sendLabel: string;
  description: string;
  presets: { label: string; prompt: string }[];
};

export const SCENARIOS: Record<ScenarioKey, Scenario> = {
  "one-shot": {
    label: "One-shot", streaming: false, sendLabel: "Send",
    description: "Một prompt → một request messages.create → một Message có content[], stop_reason, usage.",
    presets: [
      { label: "Tạo task description", prompt: "Viết task description ngắn (3–4 câu) cho task: thêm rate limit cho API đăng nhập." },
      { label: "Viết email", prompt: "Viết email tiếng Việt xin nghỉ phép 2 ngày thứ Năm và thứ Sáu tuần này, giọng chuyên nghiệp, ngắn." },
    ],
  },
  history: {
    label: "History On/Off", streaming: false, sendLabel: "Send",
    description: "Messages API stateless: Claude chỉ biết những gì nằm trong mảng messages của request này.",
    presets: [
      { label: "Câu 1: cung cấp thông tin", prompt: "Tôi đang học Python. Trả lời ngắn một câu." },
      { label: "Câu 2: hỏi lại", prompt: "Tôi vừa nói mình đang học gì?" },
    ],
  },
  streaming: {
    label: "Streaming", streaming: true, sendLabel: "Start Streaming",
    description: "messages.stream() đưa text_delta về Python, backend chuyển tiếp thành SSE; usage lấy từ final message.",
    presets: [
      { label: "Đếm 1 → 10", prompt: "Đếm từ 1 đến 10, mỗi số một dòng." },
      { label: "Giải thích event loop", prompt: "Giải thích asyncio event loop trong 5 câu tiếng Việt." },
    ],
  },
};

export const SCENARIO_KEYS = Object.keys(SCENARIOS) as ScenarioKey[];

// `code` là đoạn code có thật trong file (Ctrl+F được), không ghi số dòng để khỏi lệch khi sửa file.
export const BREAKPOINTS = [
  {
    file: "backend/demos/demo_02_claude_api/messages.py", fn: "build_request()",
    code: '"messages": messages,',
    why: "Body thật gửi Claude: `model`, `max_tokens`, `messages` (list turn), `system` là tham số top-level chứ không phải một role. Không có API key trong body — SDK đặt key ở header.",
  },
  {
    file: "backend/demos/demo_02_claude_api/messages.py", fn: "run_messages()",
    code: "message = await client.messages.create(**request_body)",
    why: "Điểm duy nhất gửi HTTP request tới Anthropic. Step Over để thấy latency thật; lỗi upstream rơi vào `except anthropic.APIError`. `max_retries=0` nên một lần Send là đúng một request.",
  },
  {
    file: "backend/demos/demo_02_claude_api/messages.py", fn: "answer_text()",
    code: 'return "".join(block.text for block in message.content if block.type == "text")',
    why: "`message.content` là LIST content block, không phải string. Xem `message.stop_reason` và `message.usage` ngay tại đây.",
  },
  {
    file: "backend/demos/demo_02_claude_api/streaming.py", fn: "stream_events()",
    code: "async for text in stream.text_stream:",
    why: "Hai tầng stream: Claude → Python ở đây, rồi Python → browser bằng SSE ở `router.py`. `await stream.get_final_message()` sau vòng lặp mới có `usage` và `stop_reason` đúng.",
  },
];

export const OUTCOMES: OutcomeItem[] = [
  { text: "Chỉ ra được từng phần của request/response: system, messages + roles, max_tokens, content blocks, stop_reason, usage." },
  { text: "Giải thích Messages API là stateless — bật/tắt history đổi hẳn câu trả lời và input_tokens, vì ứng dụng mới là chỗ giữ lịch sử." },
  { text: "Phân biệt streaming Claude→Python (messages.stream, text_delta) với SSE Python→Browser, và vì sao usage chỉ có ở final message." },
];
