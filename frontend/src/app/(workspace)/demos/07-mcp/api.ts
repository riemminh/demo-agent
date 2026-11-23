// Gọi endpoint của Demo 07: /api/demos/07/* (backend/demos/demo_07_mcp/router.py).
// Browser KHÔNG nói trực tiếp với MCP server; nó gọi bridge FastAPI, bridge spawn server cố định.
import { API_URL } from "@/lib/api";

const DEMO_URL = `${API_URL}/api/demos/07`;

export type McpEvent = { type: string; at_ms: number } & Record<string, unknown>;

export type Session = {
  server_name: string | null;
  server_version: string | null;
  protocol_version: string | null;
  capabilities: string[];
};

export type ToolSchema = {
  name: string;
  description: string | null;
  input_schema: Record<string, unknown>;
};

export type Task = { id: number; title: string; priority: string; status: string };

export type DiscoverResult = {
  connected: boolean;
  session: Session;
  tools: ToolSchema[];
  events: McpEvent[];
};

export type ToolCallResult = {
  connected: boolean;
  session: Session;
  tool: string;
  arguments: Record<string, unknown>;
  schema: ToolSchema | null;
  result: { is_error: boolean; text: string; structured: unknown };
  db_tasks: Task[];
  events: McpEvent[];
};

export type ResourcesPromptsResult = {
  connected: boolean;
  session: Session;
  resources: { uri: string; name: string; description: string | null; mime_type: string | null }[];
  resource_read: { uri: string; mime_type: string | null; text: string } | null;
  prompts: { name: string; description: string | null; arguments: string[] }[];
  prompt_get: { name: string; messages: { role: string; text: string }[] } | null;
  events: McpEvent[];
};

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

export const discover = () => request<DiscoverResult>("/discover", jsonPost());

export const callTool = (name: "list_tasks" | "get_task", taskId?: number) =>
  request<ToolCallResult>("/call-tool", jsonPost({ name, task_id: taskId ?? null }));

export const resourcesPrompts = (goal: string) =>
  request<ResourcesPromptsResult>("/resources-prompts", jsonPost({ goal }));

export const getTasks = () =>
  request<{ tasks: Task[] }>("/tasks", { cache: "no-store" }).then((data) => data.tasks);

export const seedTasks = () =>
  request<{ tasks: Task[] }>("/seed", jsonPost()).then((data) => data.tasks);

export const resetTasks = () =>
  request<{ tasks: Task[] }>("/tasks?confirm=true", { method: "DELETE" }).then((data) => data.tasks);
