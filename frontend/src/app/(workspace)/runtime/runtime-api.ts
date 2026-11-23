// Gọi các endpoint legacy /api/sessions/... (backend/api.py), không đổi contract.
// Gộp từ web.tsx và approval/page.tsx: hai bản streamMessage cũ giống nhau, chỉ khác body.
import { API_URL } from "@/lib/api";

export type AgentEvent = {
  type: string;
  approval_id?: string;
  tool?: string;
  input?: Record<string, unknown>;
  approved?: boolean;
  text?: string;
  answer?: string;
  kind?: string;
  message?: string;
  step?: number;
  total?: number;
  [key: string]: unknown;
};

// Giá trị `scenario` mà backend (agent.py: Scenario) chấp nhận.
export type BackendScenario = "sse" | "approval" | "long";

// SessionStore nằm trong RAM Python; message/approve/cancel dùng chung ID này.
export async function createSession(): Promise<string> {
  const response = await fetch(`${API_URL}/api/sessions`, { method: "POST" });
  if (!response.ok) throw new Error(`Create session: HTTP ${response.status}`);
  return ((await response.json()) as { id: string }).id;
}

// POST mở response SSE; mỗi frame hoàn chỉnh được đưa vào callback onEvent (giống socket.on).
export async function streamMessage(
  sessionId: string,
  text: string,
  scenario: BackendScenario,
  onEvent: (event: AgentEvent) => void,
): Promise<void> {
  const response = await fetch(`${API_URL}/api/sessions/${sessionId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, scenario }),
  });
  if (!response.ok || !response.body) throw new Error(`POST /messages: HTTP ${response.status}`);

  // SSE qua POST: EventSource không POST được, nên dùng fetch() + ReadableStream.
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read(); // <-- Browser chờ HTTP chunk tiếp theo.
    if (done) break;
    buffer += value;
    // Một chunk mạng có thể chứa nửa khung HOẶC nhiều khung.
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? ""; // Giữ khung chưa đủ cho đến lần đọc sau.
    for (const frame of frames) {
      const line = frame.split("\n").find((part) => part.startsWith("data: "));
      if (line) onEvent(JSON.parse(line.slice(6)) as AgentEvent);
    }
  }
}

// Dùng cho POST /approvals/{id} và POST /cancel: request HTTP KHÁC với SSE đang mở.
export async function postAction(url: string, body?: object): Promise<void> {
  const response = await fetch(url, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`POST failed: HTTP ${response.status}`);
}
