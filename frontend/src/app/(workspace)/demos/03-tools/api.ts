// Gọi endpoint của Demo 03: /api/demos/03/* (backend/demos/demo_03_tools/router.py).
import { API_URL } from "@/lib/api";

const DEMO_URL = `${API_URL}/api/demos/03`;

export type ScenarioName = "single" | "registry" | "error";

// Kết quả Python trả về sau khi chạy tool (value là giá trị thật, content là text gửi Claude).
export type ToolResult = { is_error: boolean; content: string; value: unknown };

export type ToolCall = {
  id: string; // tool_use_id do Claude sinh, phải khớp khi gửi tool_result
  name: string;
  input: Record<string, unknown>;
  result: ToolResult;
};

// Event do BACKEND đo (at_ms tính từ lúc nhận request), không phải browser.
export type ToolEvent = { type: string; at_ms: number } & Record<string, unknown>;

export type ToolRunResult = {
  status: "succeeded" | "failed";
  events: ToolEvent[];
  requests: Record<string, unknown>[];
  responses: Record<string, unknown>[];
  answer: string | null;
  tool_calls: ToolCall[];
  error: { kind: string; message: string; upstream_status: number | null } | null;
  metrics: {
    api_calls: number;
    latency_ms: number | null;
    input_tokens: number;
    output_tokens: number;
  };
};

export async function runTools(
  scenario: ScenarioName, prompt: string, maxTokens: number,
): Promise<ToolRunResult> {
  const response = await fetch(`${DEMO_URL}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenario, prompt, max_tokens: maxTokens }),
  });
  const payload: unknown = await response.json();
  // Lỗi upstream vẫn trả body đầy đủ; chỉ lỗi validate của FastAPI mới là {detail}.
  if (payload && typeof payload === "object" && "status" in payload) {
    return payload as ToolRunResult;
  }
  const detail = (payload as { detail?: unknown })?.detail;
  throw new Error(`POST /run: HTTP ${response.status} — ${JSON.stringify(detail ?? payload)}`);
}

// Schema tool đang gửi cho model (để UI cho xem "lời mô tả" khác "code Python").
export async function getToolSchemas(): Promise<Record<string, unknown>[]> {
  const response = await fetch(`${DEMO_URL}/tools`, { cache: "no-store" });
  if (!response.ok) throw new Error(`GET /tools: HTTP ${response.status}`);
  return ((await response.json()) as { tools: Record<string, unknown>[] }).tools;
}
