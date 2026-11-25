// Fetch helpers dùng chung cho Playground. Không chứa secret: frontend chỉ biết URL backend.
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:9000";

export type Health = {
  ok: boolean;
  llm_configured: boolean;
  missing_env: string[];
  model: string | null;
  max_tokens_cap: number;
  output_max_tokens?: number;
  timeout_seconds: number;
};

// GET /api/health không gọi Claude; dùng để biết backend sống và đã cấu hình chưa.
export async function getHealth(): Promise<Health> {
  const response = await fetch(`${API_URL}/api/health`, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error(`GET /api/health failed: HTTP ${response.status}`);
  return (await response.json()) as Health;
}
