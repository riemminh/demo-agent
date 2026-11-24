// Nội dung tĩnh của Demo 05: preset, breakpoint, kết quả cần đạt.

export const PROMPT_PRESETS = [
  "Làm login UI ưu tiên cao, khoảng 4 giờ.",
  "Viết tài liệu API cho team mới, không gấp, tầm 6 tiếng.",
  "Viết lại toàn bộ auth service, ưu tiên cao, khoảng 40 giờ.",
];

// JSON sai sẵn để bấm Validate mà không cần gọi Claude.
export const BAD_DRAFTS: { label: string; json: string; why: string }[] = [
  {
    label: "enum sai",
    json: '{\n  "title": "Làm login UI",\n  "priority": "urgent",\n  "estimated_hours": 4\n}',
    why: "priority không thuộc enum → Pydantic chặn ở tầng schema",
  },
  {
    label: "sai kiểu",
    json: '{\n  "title": "Làm login UI",\n  "priority": "high",\n  "estimated_hours": "bốn giờ"\n}',
    why: "estimated_hours là string → lỗi kiểu dữ liệu",
  },
  {
    label: "thiếu field",
    json: '{\n  "title": "Làm login UI"\n}',
    why: "thiếu priority và estimated_hours → Field required",
  },
  {
    label: "-4 giờ (schema OK)",
    json: '{\n  "title": "Làm login UI",\n  "priority": "high",\n  "estimated_hours": -4\n}',
    why: "đúng kiểu float nhưng vô nghĩa → chỉ semantic validation bắt được",
  },
  {
    label: "high + 40 giờ (schema OK)",
    json: '{\n  "title": "Viết lại toàn bộ auth service",\n  "priority": "high",\n  "estimated_hours": 40\n}',
    why: "đúng schema nhưng vi phạm rule nghiệp vụ: high thì phải ≤ 16 giờ",
  },
];

export const BREAKPOINTS = [
  {
    file: "backend/demos/demo_05_structured_output/generation.py", fn: "_parse_draft()",
    code: "output_format=TaskDraft, thinking={\"type\": \"disabled\"},",
    why: "Native structured output: SDK sinh JSON Schema từ model Pydantic và gửi trong `output_config.format`. Đây là ràng buộc schema thật, không phải nhờ prompt xin JSON.",
  },
  {
    file: "backend/demos/demo_05_structured_output/validation.py", fn: "validate_draft()",
    code: "draft = TaskDraft(**raw)",
    why: "Tầng 1 — schema: đúng kiểu, đủ field, enum hợp lệ. Sai ở đây thì dừng luôn, không chạy tầng 2.",
  },
  {
    file: "backend/demos/demo_05_structured_output/validation.py", fn: "validate_semantics()",
    code: "if draft.estimated_hours <= 0:",
    why: "Tầng 2 — nghiệp vụ: `-4` là float hợp lệ nhưng vô nghĩa. Schema không diễn tả được loại ràng buộc này.",
  },
  {
    file: "backend/demos/demo_05_structured_output/generation.py", fn: "repair_draft()",
    code: "call = await _parse_draft(repair_instruction(raw, errors), max_tokens)",
    why: "Repair chạy đúng MỘT lần khi người dùng bấm, chỉ gửi object fail + danh sách lỗi, rồi validate lại. Không có vòng lặp tự sửa và không mặc định là sẽ thành công.",
  },
];
