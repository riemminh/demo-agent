import type { SdkEvent } from "../demos/08-agent-sdk/api";

export function isSdkFailure(events: SdkEvent[]): boolean {
  return events.some(
    (event) =>
      event.type === "error" ||
      (event.type === "result" && event.is_error) ||
      event.type === "api_error",
  );
}

export function failureMessage(events: SdkEvent[]): string | null {
  const sdkErr = events.find((event) => event.type === "error" && event.message);
  if (sdkErr?.message) return String(sdkErr.message);
  const apiErr = events.find((event) => event.type === "api_error" && event.message);
  if (apiErr?.message) return String(apiErr.message);
  const result = events.find((event) => event.type === "result" && event.is_error && event.text);
  return result?.text ? String(result.text) : null;
}

export function isNetworkFailure(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("econnreset") || lower.includes("connection dropped") || lower.includes("connection error");
}

/** Chỉ lấy output model thật — không coi message lỗi SDK là "answer". */
export function pickAnswer(events: SdkEvent[], liveText: string): string {
  if (isSdkFailure(events)) return "";
  const result = events.find((event) => event.type === "result" && !event.is_error);
  if (typeof result?.text === "string" && result.text.trim()) return result.text;
  if (liveText.trim()) return liveText;
  return events
    .filter((event) => event.type === "assistant_text" && event.text)
    .map((event) => String(event.text))
    .join("\n");
}

export function mockEvents(prompt: string): SdkEvent[] {
  const reply = /2\s*\+\s*2/.test(prompt)
    ? "4"
  : `Mock: đã nhận «${prompt.slice(0, 160)}» (không gọi Anthropic).`;
  return [
    { type: "options_built", at_ms: 0, tools: [], skills: null, subagents: [], max_turns: 1 },
    { type: "sdk_connected", at_ms: 1, claude_code_version: "mock" },
    { type: "assistant_text", at_ms: 2, text: reply },
    { type: "result", at_ms: 3, is_error: false, num_turns: 1, text: reply },
    { type: "run_finished" },
  ];
}