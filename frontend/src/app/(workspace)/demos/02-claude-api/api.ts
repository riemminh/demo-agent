// Gọi endpoint của Demo 02: /api/demos/02/* (backend/demos/demo_02_claude_api/router.py).
// Frontend KHÔNG bao giờ gọi Anthropic trực tiếp: API key chỉ nằm ở backend.
import { API_URL } from "@/lib/api";

const DEMO_URL = `${API_URL}/api/demos/02`;

export type Turn = { role: "user" | "assistant"; content: string };

export type Metrics = {
  api_calls: number;
  latency_ms: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
};

// Body thật gửi Claude (backend trả lại để UI xem được request).
export type ClaudeRequest = {
  model: string;
  max_tokens: number;
  messages: Turn[];
  system?: string;
  thinking?: unknown;
};

export type ClaudeError = { kind: string; message: string; upstream_status: number | null };

export type ClaudeResult = {
  status: "succeeded" | "failed";
  request: ClaudeRequest | null;
  response: Record<string, unknown> | null;
  answer: string | null;
  request_id: string | null;
  metrics: Metrics;
  error: ClaudeError | null;
};

export type StreamEvent = {
  type: string;
  text?: string;
  request?: ClaudeRequest;
  response?: Record<string, unknown>;
  answer?: string;
  metrics?: Metrics;
  kind?: string;
  message?: string;
  upstream_status?: number | null;
  latency_ms?: number | null;
};

export type SendBody = { messages: Turn[]; system?: string; max_tokens: number };

// POST /messages: một request non-streaming. Lỗi upstream vẫn trả body ClaudeResult
// (status 502/503/504), còn lỗi validate của FastAPI trả {detail} -> throw.
export async function sendMessages(body: SendBody): Promise<ClaudeResult> {
  const response = await fetch(`${DEMO_URL}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload: unknown = await response.json();
  if (payload && typeof payload === "object" && "status" in payload) {
    return payload as ClaudeResult;
  }
  const detail = (payload as { detail?: unknown })?.detail;
  throw new Error(`POST /messages: HTTP ${response.status} — ${JSON.stringify(detail ?? payload)}`);
}

// POST /messages/stream: SSE. Mỗi khung `data: {...}` là một event thật của backend.
export async function streamMessages(
  body: SendBody,
  onEvent: (event: StreamEvent) => void,
): Promise<void> {
  const response = await fetch(`${DEMO_URL}/messages/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok || !response.body) {
    const detail = await response.text();
    throw new Error(`POST /messages/stream: HTTP ${response.status} — ${detail}`);
  }
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read(); // <-- Browser chờ chunk HTTP tiếp theo.
    if (done) break;
    buffer += value;
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? ""; // Giữ khung chưa đủ cho lần đọc sau.
    for (const frame of frames) {
      const line = frame.split("\n").find((part) => part.startsWith("data: "));
      if (line) onEvent(JSON.parse(line.slice(6)) as StreamEvent);
    }
  }
}
