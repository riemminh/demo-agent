// Gọi endpoint của Demo 01: /api/demos/01/* (backend/demos/demo_01_runtime/router.py).
import { API_URL } from "@/lib/api";

const DEMO_URL = `${API_URL}/api/demos/01`;

export type AgentEvent = {
  type: string;
  approval_id?: string;
  tool?: string;
  input?: Record<string, unknown>;
  approved?: boolean;
  decision?: string;
  is_error?: boolean;
  result?: string;
  text?: string;
  answer?: string;
  kind?: string;
  message?: string;
  step?: number;
  total?: number;
  timeout_seconds?: number;
  [key: string]: unknown;
};

// Giá trị scenario mà backend chấp nhận (runtime.py: Scenario).
export type BackendScenario = "sse" | "approval" | "long";

// Kết quả đọc lại file sandbox từ disk (approval_note.py: read_note()).
export type NoteFile = {
  path: string;
  exists: boolean;
  content: string | null;
  size_bytes: number;
  modified_at: string | null;
};

// SessionStore nằm trong RAM Python; run/approve/cancel dùng chung ID này.
export async function createSession(): Promise<string> {
  const response = await fetch(`${DEMO_URL}/sessions`, { method: "POST" });
  if (!response.ok) throw new Error(`POST /sessions: HTTP ${response.status}`);
  return ((await response.json()) as { id: string }).id;
}

// POST mở response SSE; mỗi khung hoàn chỉnh được đưa vào onEvent.
export async function startRun(
  sessionId: string,
  text: string,
  scenario: BackendScenario,
  onEvent: (event: AgentEvent) => void,
): Promise<void> {
  const response = await fetch(`${DEMO_URL}/sessions/${sessionId}/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, scenario }),
  });
  if (!response.ok || !response.body) throw new Error(`POST /runs: HTTP ${response.status}`);
  // EventSource không POST được, nên dùng fetch() + ReadableStream.
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read(); // <-- Browser chờ chunk HTTP tiếp theo.
    if (done) break;
    buffer += value;
    // Một chunk mạng có thể chứa nửa khung HOẶC nhiều khung.
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? ""; // Giữ khung chưa đủ cho lần đọc sau.
    for (const frame of frames) {
      const line = frame.split("\n").find((part) => part.startsWith("data: "));
      if (line) onEvent(JSON.parse(line.slice(6)) as AgentEvent);
    }
  }
}

// Approve/Reject và Cancel là request HTTP KHÁC, chạy song song với SSE đang mở.
export async function postAction(path: string, body?: object): Promise<void> {
  const response = await fetch(`${DEMO_URL}${path}`, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`POST ${path}: HTTP ${response.status}`);
}

export async function readNote(): Promise<NoteFile> {
  const response = await fetch(`${DEMO_URL}/file`, { cache: "no-store" });
  if (!response.ok) throw new Error(`GET /file: HTTP ${response.status}`);
  return (await response.json()) as NoteFile;
}

// Xóa file sandbox của riêng demo 01; backend bắt buộc confirm=true.
export async function resetNote(): Promise<NoteFile> {
  const response = await fetch(`${DEMO_URL}/file?confirm=true`, { method: "DELETE" });
  if (!response.ok) throw new Error(`DELETE /file: HTTP ${response.status}`);
  return (await response.json()) as NoteFile;
}
