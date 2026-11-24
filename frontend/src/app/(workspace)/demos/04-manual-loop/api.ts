// Gọi endpoint của Demo 04: /api/demos/04/* (backend/demos/demo_04_manual_loop/router.py).
import { API_URL } from "@/lib/api";
import { consumeSse } from "@/lib/sse";
import type { ScenarioKey } from "./content";

const DEMO_URL = `${API_URL}/api/demos/04`;

// Event do BACKEND ghi trong lúc loop chạy (at_ms đo ở Python, trừ event approval).
export type LoopEvent = {
  type: string;
  at_ms?: number;
  turn?: number;
  stop_reason?: string;
  blocks?: string[];
  name?: string;
  id?: string;
  input?: Record<string, unknown>;
  is_error?: boolean;
  content?: string;
  answer?: string;
  turns_used?: number;
  created_ids?: number[];
  history_before?: number;
  history_after?: number;
  max_turns?: number;
  messages_in_request?: number;
  usage?: { input_tokens: number; output_tokens: number };
  approval_id?: string;
  tool?: string;
  timeout_seconds?: number;
  approved?: boolean;
  kind?: string;
  message?: string;
  scenario?: string;
  system_prompt?: string;
  files?: string[];
  loaded_files?: { path: string; content: string }[];
  skills?: { name: string; description: string }[];
  preview?: string;
  chars?: number;
  allowed?: boolean;
  reason?: string;
  agents?: { name: string; description: string }[];
  agent?: string;
  subagent?: string;
  instruction?: string;
  result_preview?: string;
};

export type Task = { id: number; title: string; priority: string; status: string };

export async function createSession(): Promise<string> {
  const response = await fetch(`${DEMO_URL}/sessions`, { method: "POST" });
  if (!response.ok) throw new Error(`POST /sessions: HTTP ${response.status}`);
  return ((await response.json()) as { id: string }).id;
}

export async function getSession(sessionId: string): Promise<{ history_messages: number; busy: boolean }> {
  const response = await fetch(`${DEMO_URL}/sessions/${sessionId}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`GET /sessions: HTTP ${response.status}`);
  return (await response.json()) as { history_messages: number; busy: boolean };
}

// POST /runs mở SSE; mỗi khung là một event thật của loop.
export async function startRun(
  sessionId: string,
  scenario: ScenarioKey,
  prompt: string,
  maxTurns: number,
  structuredFinish: boolean,
  onEvent: (event: LoopEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(`${DEMO_URL}/sessions/${sessionId}/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scenario,
      prompt,
      max_turns: maxTurns,
      structured_finish: structuredFinish,
    }),
    signal,
  });
  if (!response.ok || !response.body) {
    throw new Error(`POST /runs: HTTP ${response.status} — ${await response.text()}`);
  }
  await consumeSse(response, onEvent, signal);
}

// Approve/Reject và Cancel là request HTTP khác, chạy song song với SSE đang mở.
export async function postAction(path: string, body?: object): Promise<void> {
  const response = await fetch(`${DEMO_URL}${path}`, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`POST ${path}: HTTP ${response.status}`);
}

export async function getTasks(): Promise<Task[]> {
  const response = await fetch(`${DEMO_URL}/tasks`, { cache: "no-store" });
  if (!response.ok) throw new Error(`GET /tasks: HTTP ${response.status}`);
  return ((await response.json()) as { tasks: Task[] }).tasks;
}

// Chỉ xóa scope manual_loop; backend bắt buộc confirm=true.
export async function resetTasks(): Promise<Task[]> {
  const response = await fetch(`${DEMO_URL}/tasks?confirm=true`, { method: "DELETE" });
  if (!response.ok) throw new Error(`DELETE /tasks: HTTP ${response.status}`);
  return ((await response.json()) as { tasks: Task[] }).tasks;
}
