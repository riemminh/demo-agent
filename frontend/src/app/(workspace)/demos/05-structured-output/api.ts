// Gọi endpoint của Demo 05: /api/demos/05/* (backend/demos/demo_05_structured_output/router.py).
import { API_URL } from "@/lib/api";

const DEMO_URL = `${API_URL}/api/demos/05`;

export type DraftEvent = { type: string } & Record<string, unknown>;

export type DraftResult = {
  stage: "generate" | "validate" | "repair";
  status: "succeeded" | "failed";
  raw: unknown; // Object model trả về, hoặc JSON người dùng sửa tay.
  accepted: boolean; // Chỉ true khi qua CẢ schema và semantic.
  schema_errors: string[];
  semantic_errors: string[];
  response: Record<string, unknown> | null;
  metrics: { api_calls: number; latency_ms: number | null; input_tokens: number; output_tokens: number } | null;
  error: { kind: string; message: string; upstream_status: number | null } | null;
  events: DraftEvent[];
  before?: unknown; // Chỉ có ở stage repair.
};

async function post(path: string, body: object): Promise<DraftResult> {
  const response = await fetch(`${DEMO_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload: unknown = await response.json();
  if (payload && typeof payload === "object" && "stage" in payload) {
    return payload as DraftResult;
  }
  const detail = (payload as { detail?: unknown })?.detail;
  throw new Error(`POST ${path}: HTTP ${response.status} — ${JSON.stringify(detail ?? payload)}`);
}

// Gọi Claude với native structured output (output_format=TaskDraft).
export function generateDraft(prompt: string): Promise<DraftResult> {
  return post("/generate", { prompt, max_tokens: 256 });
}

// KHÔNG gọi Claude: chỉ Pydantic + semantic check trong Python.
export function validateDraft(draft: unknown): Promise<DraftResult> {
  return post("/validate", { draft });
}

// Một lần repair duy nhất, kèm đúng những lỗi đã phát hiện.
export function repairDraft(draft: unknown, errors: string[]): Promise<DraftResult> {
  return post("/repair", { draft, errors, max_tokens: 256 });
}

export async function getSchema(): Promise<Record<string, unknown>> {
  const response = await fetch(`${DEMO_URL}/schema`, { cache: "no-store" });
  if (!response.ok) throw new Error(`GET /schema: HTTP ${response.status}`);
  return ((await response.json()) as { schema: Record<string, unknown> }).schema;
}
