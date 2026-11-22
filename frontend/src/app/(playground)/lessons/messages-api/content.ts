// Nội dung của feature 06 (Plan V3, mục D2). Tách khỏi UI để dễ sửa câu chữ.
import type { OutcomeItem } from "@/components/LearningOutcome";

export type PresetKey = "task" | "leave_email";

export type Preset = {
  label: string;
  titleLabel: string;
  detailsLabel: string;
  runLabel: string;
  title: string;
  details: string;
  system: string;
  // Prompt gửi Claude được ghép ở đây (frontend). Tab Request hiện đúng chuỗi kết quả.
  buildPrompt: (title: string, details: string) => string;
};

export const PRESETS: Record<PresetKey, Preset> = {
  task: {
    label: "Task Description",
    titleLabel: "Task title",
    detailsLabel: "Requirements",
    runLabel: "Generate Description",
    title: "Build Login UI",
    details: "Form đăng nhập email/password.\nValidate email đúng định dạng, password tối thiểu 8 ký tự.\nHiện lỗi khi đăng nhập sai, có nút Show password.",
    system:
      "You write task descriptions for a software team's task manager. Use plain text (no Markdown) with three sections: Goal, Scope, Acceptance Criteria (at most 5 bullets). Keep it under 150 words. Write in the same language as the requirements. Reply with the description only.",
    buildPrompt: (title, details) =>
      `Viết mô tả cho task sau.\n\nTask title: ${title}\n\nRequirements:\n${details}`,
  },
  leave_email: {
    label: "Leave Email",
    titleLabel: "Mục đích email",
    detailsLabel: "Chi tiết",
    runLabel: "Generate Email",
    title: "Xin nghỉ phép 1 ngày vào thứ Sáu tuần này",
    details: "Gửi quản lý trực tiếp. Lý do: việc gia đình. Viết bằng tiếng Anh, ngắn gọn, lịch sự.",
    system:
      "You are a helpful assistant that writes clear, professional workplace emails. Reply with the email only.",
    buildPrompt: (title, details) => `Viết giúp tôi một email: ${title}.\n\n${details}`,
  },
};

export const DEFAULT_MAX_TOKENS = 512;

// Concept ngắn, nằm trong Collapse phụ (Plan V3: 2–4 câu).
export const CONCEPT = [
  "Mỗi lần bấm Generate, backend gọi `client.messages.create()` đúng một lần (`max_retries=0`) với `model`, `system`, `messages` và `max_tokens`; API key chỉ nằm ở backend.",
  "Claude trả về một Message: `content` là list block (bài này chỉ có block `text`), kèm `stop_reason` và `usage` do API đếm.",
  "API stateless và không có vòng lặp: Claude không biết lần chạy trước và không gọi tool. Đây là một LLM call, chưa phải Agent.",
];

export const OUTCOMES: OutcomeItem[] = [
  { text: "Bấm Generate một lần thì Metrics ghi API calls = 1, tab Request hiện đúng body gửi messages.create, không có key." },
  { text: "Draft trong ô kết quả lấy từ các block text của response thật; Copy hoặc sửa được ngay để dùng." },
  { text: "Đọc được stop_reason: end_turn là xong, max_tokens là bị cắt (thử max_tokens = 20 trong Tùy chọn nâng cao)." },
  { text: "Biết khi nào một API call là đủ (viết mô tả, email) và khi nào cần Tool/Agent (đọc file, tạo task thật)." },
];
