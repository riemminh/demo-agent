// Gọi endpoint của Demo 08: /api/demos/08/* (backend/demos/demo_08_agent_sdk/router.py).
import { API_URL } from "@/lib/api";
import { consumeSse } from "@/lib/sse";

const DEMO_URL = `${API_URL}/api/demos/08`;

export type ScenarioName = "basic" | "permissions" | "skills" | "subagents";

export type SdkEvent = {
  type: string;
  at_ms?: number;
  text?: string;
  tool?: string;
  input?: Record<string, unknown>;
  id?: string;
  tool_use_id?: string;
  is_error?: boolean;
  content?: string;
  subtype?: string;
  hook?: string;
  prompt?: string;
  session_id?: string;
  allowed?: boolean;
  reason?: string;
  tools?: string[];
  skills?: string[] | null;
  subagents?: string[];
  subagents_registered?: string[];
  max_turns?: number;
  max_budget_usd?: number;
  cwd?: string;
  claude_code_version?: string;
  pid?: number;
  current_permission_mode?: string;
  num_turns?: number;
  duration_ms?: number;
  total_cost_usd?: number | null;
  kind?: string;
  message?: string;
  approval_id?: string;
  timeout_seconds?: number;
};

export type Env = {
  sdk_version: string;
  cli_found: boolean;
  cli_path: string | null;
  api_key_configured: boolean;
  model: string | null;
  sandbox_dir: string;
  max_turns: number;
  max_budget_usd: number;
  run_timeout_seconds: number;
  approval_timeout_seconds: number;
  messages_api_reachable: boolean;
  https_proxy_configured: boolean;
  openssl_conf_active: boolean;
  sdk_cli_may_fail_despite_messages: boolean;
  sdk_messages_fallback: boolean;
  prefer_messages_over_cli: boolean;
  scenarios: Record<ScenarioName, {
    label: string; prompt: string; tools: string[]; skills: string[] | null; subagents: boolean;
  }>;
};

export type Inspection = {
  scenario: ScenarioName;
  connect_ms: number;
  cli_version: string | null;
  pid: number | null;
  permission_mode: string | null;
  allowed_tools: string[];
  skills: string[] | null;
  subagents_declared: string[];
  subagents_registered: string[];
  cwd: string;
  transport?: string;
};

export type Task = { id: number; title: string; priority: string; status: string };

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${DEMO_URL}${path}`, init);
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    const detail = (payload as { detail?: unknown })?.detail;
    throw new Error(`${path}: HTTP ${response.status} — ${JSON.stringify(detail ?? "")}`);
  }
  return (await response.json()) as T;
}

const jsonPost = (body?: object): RequestInit => ({
  method: "POST",
  headers: body ? { "Content-Type": "application/json" } : undefined,
  body: body ? JSON.stringify(body) : undefined,
});

export const getEnv = () => request<Env>("/env", { cache: "no-store" });

// Spawn CLI + initialize, KHÔNG gọi model: nhanh và chạy được cả khi mạng chặn model.
export const inspectScenario = (scenario: ScenarioName) =>
  request<Inspection>("/inspect", jsonPost({ scenario }));

export const createSession = () =>
  request<{ id: string }>("/sessions", jsonPost()).then((data) => data.id);

export async function startRun(
  sessionId: string,
  scenario: ScenarioName,
  prompt: string,
  onEvent: (event: SdkEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(`${DEMO_URL}/sessions/${sessionId}/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenario, prompt }),
    signal,
  });
  if (!response.ok || !response.body) {
    throw new Error(`POST /runs: HTTP ${response.status} — ${await response.text()}`);
  }
  await consumeSse(response, onEvent, signal);
}

export const postAction = (path: string, body?: object) =>
  request<unknown>(path, jsonPost(body));

export const getTasks = () =>
  request<{ tasks: Task[] }>("/tasks", { cache: "no-store" }).then((data) => data.tasks);

export const resetTasks = () =>
  request<{ tasks: Task[] }>("/tasks?confirm=true", { method: "DELETE" }).then((data) => data.tasks);
