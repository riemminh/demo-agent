// Contract JSON của POST /api/lessons/messages-api (backend/lessons/messages_api.py).
// Endpoint backend giữ nguyên tên cũ để không đổi backend trong Phase A.

export type ContentBlock = { type: string; text?: string; [key: string]: unknown };

// Message object Claude trả về (to_dict() của SDK: chỉ các field API thực sự gửi).
export type ClaudeMessage = {
  id: string;
  type: string;
  role: string;
  model: string;
  content: ContentBlock[];
  stop_reason: string | null;
  stop_sequence: string | null;
  usage: { input_tokens: number; output_tokens: number; [key: string]: unknown };
  [key: string]: unknown;
};

export type MessagesApiResult = {
  status: "succeeded" | "failed";
  request: Record<string, unknown> | null; // null khi không gửi request (thiếu config).
  response: ClaudeMessage | null;
  answer: string | null;
  request_id: string | null;
  metrics: {
    api_calls: number;
    latency_ms: number | null;
    input_tokens: number | null;
    output_tokens: number | null;
  };
  error: { kind: string; message: string; upstream_status: number | null } | null;
};

// Một lần bấm Run: kết quả backend + số đo phía browser.
export type RunRecord = {
  sentAt: Date;
  roundTripMs: number;
  httpStatus: number | null; // null khi fetch không tới được backend.
  result: MessagesApiResult | null; // null khi lỗi không theo contract (422, network...).
  clientError: string | null;
};

export type DemoInput = { prompt: string; system: string; max_tokens: number };
