/** Đọc SSE từ fetch body; báo lỗi nếu stream đóng trước run_finished. */
export class SseIncompleteError extends Error {
  constructor() {
    super("SSE kết thúc trước run_finished — có thể do ngắt kết nối.");
    this.name = "SseIncompleteError";
  }
}

export async function consumeSse<T>(
  response: Response,
  onEvent: (event: T) => void,
  signal?: AbortSignal,
): Promise<void> {
  if (!response.body) throw new Error("Response không có body stream");
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let sawRunFinished = false;
  try {
    for (;;) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";
      for (const frame of frames) {
        const line = frame.split("\n").find((part) => part.startsWith("data: "));
        if (!line) continue;
        const event = JSON.parse(line.slice(6)) as T & { type?: string };
        onEvent(event);
        if (event.type === "run_finished") sawRunFinished = true;
      }
    }
  } finally {
    reader.releaseLock();
  }
  if (!sawRunFinished) throw new SseIncompleteError();
}