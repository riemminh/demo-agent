// Gọi endpoint của Demo 06: /api/demos/06/* (backend/demos/demo_06_workflows/router.py).
import { API_URL } from "@/lib/api";

const DEMO_URL = `${API_URL}/api/demos/06`;

export type PatternName = "chaining" | "routing" | "parallel" | "orchestrator" | "evaluator";

// Step kind="llm" là một call Claude thật; kind="code" là quyết định của Python.
export type WorkflowStep = {
  kind: "llm" | "code";
  name: string;
  start_ms: number;
  end_ms: number;
  prompt?: string;
  output?: string;
  detail?: string;
  stop_reason?: string;
  usage?: { input_tokens: number; output_tokens: number };
};

export type WorkflowResult = {
  status: "succeeded" | "failed";
  scenario: PatternName;
  answer: string | null;
  steps: WorkflowStep[];
  metrics: {
    api_calls: number;
    budget: number;
    latency_ms: number;
    input_tokens: number;
    output_tokens: number;
  } | null;
  error: { kind: string; message: string; upstream_status: number | null } | null;
};

export type Caps = {
  budgets: Record<PatternName, number>;
  max_workers: number;
  max_revisions: number;
};

export async function runWorkflow(scenario: PatternName, input: string): Promise<WorkflowResult> {
  const response = await fetch(`${DEMO_URL}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenario, input }),
  });
  const payload: unknown = await response.json();
  // Cả khi fail (budget/API) backend vẫn trả trace để thấy nó dừng ở bước nào.
  if (payload && typeof payload === "object" && "status" in payload) {
    return payload as WorkflowResult;
  }
  const detail = (payload as { detail?: unknown })?.detail;
  throw new Error(`POST /run: HTTP ${response.status} — ${JSON.stringify(detail ?? payload)}`);
}

export async function getCaps(): Promise<Caps> {
  const response = await fetch(`${DEMO_URL}/caps`, { cache: "no-store" });
  if (!response.ok) throw new Error(`GET /caps: HTTP ${response.status}`);
  return (await response.json()) as Caps;
}
