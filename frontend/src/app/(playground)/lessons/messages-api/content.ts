// Nội dung học của Lesson 06 (Plan V2 mục 7, lesson 06). Tách khỏi UI để dễ sửa câu chữ.
import type { CheckpointQuestion } from "@/components/KnowledgeCheckpoint";
import type { OutcomeItem } from "@/components/LearningOutcome";
import type { DemoInput } from "./types";

export const DEFAULT_INPUT: DemoInput = {
  prompt:
    "Viết giúp tôi một email bằng tiếng Anh gửi quản lý để xin nghỉ phép 1 ngày vào thứ Sáu tuần này vì việc gia đình. Ngắn gọn, lịch sự.",
  system: "You are a helpful assistant that writes clear, professional workplace emails. Reply with the email only.",
  max_tokens: 512,
};

export const CONCEPTS: { key: string; label: string; text: string }[] = [
  { key: "model", label: "model",
    text: "ID model đọc từ LLM_MODEL ở backend; UI chỉ hiển thị read-only. Response trả lại field model mà API thực sự dùng." },
  { key: "system", label: "system prompt",
    text: "Tham số top-level `system`, đặt vai trò và quy tắc. Nó không phải một phần tử trong `messages`. Để trống thì backend không gửi field này." },
  { key: "messages", label: "messages & role",
    text: "Danh sách message theo thứ tự, role là `user` hoặc `assistant`. Bài này gửi đúng 1 user message. API stateless: muốn Claude biết lượt trước, app phải tự gửi lại history (Lesson 07)." },
  { key: "content", label: "content blocks",
    text: "response.content là LIST các block có `type`. Bài này chỉ có block `text`; Module 3 sẽ thấy `tool_use`. Final text = ghép các block type text." },
  { key: "max_tokens", label: "max_tokens",
    text: "Trần số token OUTPUT model được sinh, không phải giới hạn input. Chạm trần thì stop_reason = max_tokens và text bị cắt giữa chừng." },
  { key: "stop_reason", label: "stop_reason",
    text: "Lý do model dừng: end_turn (trả lời xong), max_tokens (bị cắt), stop_sequence, tool_use... Không phải mọi stop_reason đều là kết quả hoàn chỉnh." },
  { key: "usage", label: "usage & latency",
    text: "usage.input_tokens / output_tokens do API đếm thật, là cơ sở tính chi phí. Latency đo bằng time.perf_counter() quanh messages.create ở backend." },
];

export const FLOW_STEPS: { title: string; content: string }[] = [
  { title: "Browser", content: "Form → fetch POST JSON" },
  { title: "FastAPI", content: "Pydantic validate body" },
  { title: "run_messages_api", content: "Dựng request_body" },
  { title: "Claude API", content: "messages.create — 1 request" },
  { title: "Message", content: "content, stop_reason, usage" },
  { title: "UI", content: "Request / Response / Result / Metrics" },
];

export const OUTCOMES: OutcomeItem[] = [
  { label: "What", text: "Tự gọi Messages API bằng AsyncAnthropic + messages.create và đọc được Message object: id, model, content blocks, stop_reason, usage." },
  { label: "Why", text: "Mọi lesson sau (history, streaming, tool, agent loop) đều xây trên cặp request/response này; hiểu nó thì debug được khi model trả kết quả lạ." },
  { label: "How", text: "Backend giữ API key, dựng request_body tường minh, gọi đúng 1 lần (max_retries=0), đo latency, trả JSON cho UI. Frontend không bao giờ thấy key." },
  { label: "When", text: "Một LLM call là đủ khi việc chỉ có một bước, không cần tool hay nhiều vòng: viết email, tóm tắt, dịch. Cần hành động thật hoặc nhiều bước thì dùng Tool/Agent (Module 3–4)." },
  { label: "Phân biệt", text: "system khác message role; API stateless khác SessionStore; 1 API call khác Agent." },
];

export const CHECKPOINT: CheckpointQuestion[] = [
  { question: "response.content của Claude có dạng gì?",
    options: ["Một string", "Một list content block, mỗi block có type", "Object { text } duy nhất"],
    correctIndex: 1,
    explanation: "content là list block. Code phải lọc block type = text rồi ghép lại; khi có tool, list sẽ có thêm block tool_use." },
  { question: "Một lần gọi messages.create (không tool, không loop) có phải là Agent không?",
    options: ["Có, vì đã dùng LLM", "Không: chỉ một LLM call, model không quyết định bước tiếp theo hay gọi tool", "Có, nếu system prompt đủ dài"],
    correctIndex: 1,
    explanation: "Agent cần vòng lặp, trong đó model chọn hành động (tool) và code thực thi rồi gửi kết quả lại. Ở đây code gọi một lần rồi dừng." },
  { question: "Đặt max_tokens = 30 và nhận stop_reason = \"max_tokens\". Điều gì đúng?",
    options: ["Prompt input quá dài", "Output bị cắt khi chạm trần, email chưa hoàn chỉnh", "API lỗi nên không có usage"],
    correctIndex: 1,
    explanation: "max_tokens giới hạn số token sinh ra. Request vẫn thành công, có usage, nhưng answer không được coi là kết quả hoàn chỉnh." },
  { question: "Bấm Run lần 2 với prompt \"Sửa email vừa rồi cho ngắn hơn\". Claude có biết email lần 1 không?",
    options: ["Có, vì cùng API key", "Có, vì cùng tab trình duyệt", "Không: mỗi request độc lập, request 2 không chứa email lần 1"],
    correctIndex: 2,
    explanation: "Messages API stateless. Claude chỉ thấy những gì nằm trong request hiện tại; muốn nối tiếp phải gửi lại history (Lesson 07)." },
];
