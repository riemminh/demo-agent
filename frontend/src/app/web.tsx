"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type AgentEvent = {
  type: string;
  text?: string;
  answer?: string;
  [key: string]: unknown;
};

const API_URL = "http://localhost:9000";

// Đây là "on event" phía FRONTEND: gọi callback cho mỗi khung SSE.
async function streamMessage(
  sessionId: string,
  text: string,
  onEvent: (event: AgentEvent) => void,
): Promise<void> {
  const response = await fetch(`${API_URL}/api/sessions/${sessionId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!response.ok || !response.body) {
    throw new Error(`POST /messages failed: HTTP ${response.status}`);
  }

  // SSE qua POST: EventSource không POST được, nên dùng fetch() + ReadableStream.
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";

  for (;;) {
    const { value, done } = await reader.read(); // Chờ chunk mạng tiếp theo.
    if (done) break;
    buffer += value;

    // Một chunk mạng có thể chứa nửa khung HOẶC nhiều khung.
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? ""; // Giữ khung chưa đủ cho đến lần đọc sau.

    for (const frame of frames) {
      const line = frame.split("\n").find((item) => item.startsWith("data: "));
      if (!line) continue;
      onEvent(JSON.parse(line.slice(6)) as AgentEvent); // Gửi event vào React.
    }
  }
}

export default function Web() {
  const initialized = useRef(false);
  const [sessionId, setSessionId] = useState("");
  const [draft, setDraft] = useState("Why HTTP 429?");
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [liveText, setLiveText] = useState("");
  const [answer, setAnswer] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  // Lần load đầu: tạo session backend (lưu trong RAM Python).
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    fetch(`${API_URL}/api/sessions`, { method: "POST" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Create session failed: HTTP ${r.status}`);
        return (await r.json()) as { id: string };
      })
      .then(({ id }) => setSessionId(id))
      .catch((e: Error) => setError(e.message));
  }, []);

  function handleEvent(event: AgentEvent) {
    // Gọi một lần cho mỗi event SSE HOÀN CHỈNH: giống socket.on("event", callback).
    setEvents((old) => [...old, event]);
    if (event.type === "text_delta") {
      setLiveText((old) => old + String(event.text ?? ""));
    }
    if (event.type === "final") {
      setAnswer(String(event.answer ?? ""));
    }
  }

  async function send() {
    if (!sessionId || !draft.trim() || running) return;
    setRunning(true);
    setError("");
    setEvents([]);
    setLiveText("");
    setAnswer("");
    try {
      await streamMessage(sessionId, draft, handleEvent);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  return (
    <main style={{ maxWidth: 760, margin: "40px auto", fontFamily: "sans-serif" }}>
      <h1>FastAPI → Queue → SSE → Next.js</h1>
      <p><Link href="/approval">Open Approval + Cancel demo →</Link></p>
      <p><Link href="/playground">Open Claude Agent Playground V2 →</Link></p>
      <p>Session ID: <code>{sessionId || "Creating..."}</code></p>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        style={{ padding: 10, width: "65%" }}
        aria-label="Your question"
      />
      <button disabled={!sessionId || running} onClick={send} style={{ padding: 10 }}>
        {running ? "Running..." : "Send"}
      </button>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      <h2>Live text (text_delta)</h2>
      <p>{liveText || "No text yet"}</p>
      <h2>Final answer</h2>
      <p>{answer || "Waiting for final event"}</p>
      <h2>All received events ({events.length})</h2>
      <pre style={{ whiteSpace: "pre-wrap", background: "#eee", padding: 12 }}>
        {events.map((event, i) => `${i + 1}. ${JSON.stringify(event)}`).join("\n")}
      </pre>
    </main>
  );
}
