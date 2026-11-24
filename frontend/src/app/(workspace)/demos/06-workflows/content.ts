// Nội dung tĩnh của Demo 06: 5 pattern, prompt mẫu, breakpoint, kết quả cần đạt.
import type { PatternName } from "./api";

export type Pattern = {
  label: string;
  oneLiner: string;
  whoDecides: string; // Code quyết định gì, model quyết định gì.
  watch: string; // Nhìn vào đâu trong trace.
  presets: string[];
  breakpoint: { file: string; fn: string; code: string; why: string };
};

const FILE = "backend/demos/demo_06_workflows/patterns.py";

export const PATTERNS: Record<PatternName, Pattern> = {
  chaining: {
    label: "Chaining", oneLiner: "Hai call tuần tự: output bước 1 là input bước 2.",
    whoDecides: "Code quyết định có mấy bước và thứ tự; model chỉ viết nội dung.",
    watch: "start_ms của call 2 bằng end_ms của call 1 — không có gì chạy song song.",
    presets: ["thêm rate limit cho API đăng nhập", "làm trang quên mật khẩu"],
    breakpoint: {
      file: FILE, fn: "chaining()", code: 'f"Mô tả: {draft}",',
      why: "Output của call trước được nhúng vào prompt call sau. Lỗi ở bước 1 sẽ lan sang bước 2 — đó là nhược điểm của chaining.",
    },
  },
  routing: {
    label: "Routing", oneLiner: "Một call phân loại intent, rồi Python chọn nhánh xử lý.",
    whoDecides: "Model quyết định nhãn; code quyết định nhãn nào chạy handler nào.",
    watch: "step code:route ghi đúng nhãn classifier trả về; nhãn lạ thì fallback, không gọi thêm.",
    presets: [
      "Dịch câu này sang tiếng Anh: tôi cần nghỉ phép",
      "Tóm tắt giúp tôi cuộc họp sáng nay về tiến độ sprint",
      "Viết mô tả task cho việc thêm 2FA",
    ],
    breakpoint: {
      file: FILE, fn: "routing()", code: "intent = next((name for name in INTENTS if name in label.lower()), None)",
      why: "Branch là code Python đọc nhãn, không phải model tự gọi hàm. Nhãn ngoài danh sách -> intent=None -> fallback an toàn.",
    },
  },
  parallel: {
    label: "Parallel", oneLiner: "Hai yêu cầu độc lập chạy đồng thời bằng asyncio.gather().",
    whoDecides: "Code quyết định việc nào độc lập và chạy song song được.",
    watch: "hai step llm chồng thời gian; tổng latency nhỏ hơn tổng thời gian từng call.",
    presets: [
      "Làm trang đăng nhập; Viết tài liệu API cho team mới",
      "Thêm 2FA; Tối ưu truy vấn báo cáo",
    ],
    breakpoint: {
      file: FILE, fn: "parallel()", code: "answers = await asyncio.gather(",
      why: "gather() khởi động cả hai coroutine rồi chờ cả hai. Chỉ dùng được khi các việc KHÔNG phụ thuộc nhau.",
    },
  },
  orchestrator: {
    label: "Orchestrator", oneLiner: "Model lập kế hoạch động, code cap số worker rồi chạy từng worker.",
    whoDecides: "Model quyết định chia việc thế nào; code quyết định chạy bao nhiêu phần.",
    watch: "step code:cap ghi 'planner đề xuất N, code chỉ chạy 2' — cap là giới hạn thật.",
    presets: ["làm tính năng Login cho web app", "chuẩn bị release 1.2"],
    breakpoint: {
      file: FILE, fn: "orchestrator()", code: "subtasks = proposed[:MAX_WORKERS]",
      why: "Số bước do model đề xuất nên phải bị chặn ở code, nếu không chi phí phụ thuộc vào output của model.",
    },
  },
  evaluator: {
    label: "Evaluator", oneLiner: "Generate → Evaluate → tối đa một lần revise theo feedback.",
    whoDecides: "Model vừa viết vừa tự đánh giá; code quyết định được sửa mấy lần.",
    watch: "verdict ACCEPT/REVISE là output thật của call evaluate; step code:decision ghi lại quyết định.",
    presets: ["sửa bug login", "viết mô tả task cho việc dọn log server"],
    breakpoint: {
      file: FILE, fn: "evaluator()", code: "for revision in range(MAX_REVISIONS + 1):",
      why: "Vòng feedback phải có cận trên. Hết lượt mà vẫn REVISE thì trả bản cuối KÈM feedback chưa xử lý, không giả vờ là đã accept.",
    },
  },
};

export const PATTERN_KEYS = Object.keys(PATTERNS) as PatternName[];
