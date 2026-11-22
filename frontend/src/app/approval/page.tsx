"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type AgentEvent = {
  type: string;
  approval_id?: string;
  tool?: string;
  input?: Record<string, unknown>;
  approved?: boolean;
  text?: string;
  answer?: string;
  kind?: string;
  message?: string;
  step?: number;
  total?: number;
  [key: string]: unknown;
};

type Scenario = "approval" | "long";
const API_URL = "http://localhost:9000";

// Giống web.tsx: POST mở response SSE; mỗi frame được đưa vào callback onEvent.
async function streamMessage(
  sessionId: string,
  scenario: Scenario,
  onEvent: (event: AgentEvent) => void,
): Promise<void> {
  const response = await fetch(`${API_URL}/api/sessions/${sessionId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: scenario === "approval" ? "Please create a support ticket" : "Run 20 long steps",
      scenario,
    }),
  });
  if (!response.ok || !response.body) throw new Error(`POST /messages: HTTP ${response.status}`);

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read(); // <-- Browser chờ HTTP chunks.
    if (done) break;
    buffer += value;
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const line = frame.split("\n").find((part) => part.startsWith("data: "));
      if (line) onEvent(JSON.parse(line.slice(6)) as AgentEvent); // <-- Giống socket.on.
    }
  }
}

async function postAction(url: string, body?: object): Promise<void> {
  const response = await fetch(url, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`POST failed: HTTP ${response.status}`);
}

const card: React.CSSProperties = {
  border: "1px solid #d8e0e9", borderRadius: 12, padding: 16, marginBottom: 16,
};
const button: React.CSSProperties = {
  padding: "10px 14px", border: "1px solid #c5ccd6", borderRadius: 8,
  cursor: "pointer", backgroundColor: "#fff", color: "#172033",
};

export default function ApprovalPage() {
  const initialized = useRef(false);
  const [sessionId, setSessionId] = useState("");
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<AgentEvent | null>(null);
  const [decisionSending, setDecisionSending] = useState(false);
  const [cancelRequested, setCancelRequested] = useState(false);
  const [answer, setAnswer] = useState("");
  const [liveText, setLiveText] = useState("");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    // SessionStore nằm trong RAM Python; cả message/approve/cancel dùng chung ID.
    fetch(`${API_URL}/api/sessions`, { method: "POST" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Create session: HTTP ${response.status}`);
        return (await response.json()) as { id: string };
      })
      .then(({ id }) => setSessionId(id))
      .catch((e: Error) => setError(e.message));
  }, []);

  function handleEvent(event: AgentEvent) {
    setEvents((old) => [...old, event]);
    if (event.type === "approval_required") {
      // Đây là event Agent gửi lên trước khi await Future.
      setPendingApproval(event);
    }
    if (event.type === "approval_decision" || event.type === "approval_timeout") {
      setPendingApproval(null);
      setDecisionSending(false);
    }
    if (event.type === "progress") setProgress(Number(event.step ?? 0));
    if (event.type === "text_delta") setLiveText((old) => old + String(event.text ?? ""));
    if (event.type === "final") setAnswer(String(event.answer ?? ""));
    if (event.type === "run_finished") {
      setPendingApproval(null);
      setDecisionSending(false);
    }
  }

  async function start(scenario: Scenario) {
    if (!sessionId || running) return;
    setRunning(true);
    setEvents([]);
    setAnswer("");
    setLiveText("");
    setError("");
    setProgress(0);
    setPendingApproval(null);
    setDecisionSending(false);
    setCancelRequested(false);
    try {
      // Không await Agent trong backend API: create_task() cho phép stream ngay.
      await streamMessage(sessionId, scenario, handleEvent);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
      setPendingApproval(null);
      setDecisionSending(false);
    }
  }

  async function decide(approved: boolean) {
    if (!sessionId || !pendingApproval?.approval_id || decisionSending) return;
    setDecisionSending(true);
    try {
      // HTTP request KHÁC với /messages SSE đang chạy bên trên!
      await postAction(
        `${API_URL}/api/sessions/${sessionId}/approvals/${pendingApproval.approval_id}`,
        { approved },
      );
      // Không tự kết luận kết quả ở đây: đợi SSE approval_decision từ backend.
    } catch (e) {
      setDecisionSending(false);
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function cancel() {
    if (!sessionId || !running || cancelRequested) return;
    try {
      // Quan trọng: gọi backend cancel Task, KHÔNG chỉ AbortController.abort().
      await postAction(`${API_URL}/api/sessions/${sessionId}/cancel`);
      setCancelRequested(true);
      // SSE cũ vẫn mở để nhận error(kind=cancelled) rồi run_finished.
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <main style={{ maxWidth: 920, margin: "36px auto", padding: "0 16px", fontFamily: "system-ui, sans-serif", color: "#182236" }}>
      <p><Link href="/">← Quay lại SSE demo</Link></p>
      <h1>Agent Approval + Cancel Demo</h1>
      <p>Giữ nguyên <code>Queue → SSE → reader.read()</code>, bổ sung <code>Future</code> chờ approval và <code>Task.cancel()</code> để dừng Agent.</p>
      <p>Session ID: <code>{sessionId || "Creating..."}</code> · Agent: <strong>{running ? "Running" : "Idle"}</strong></p>

      <section style={card}>
        <h2 style={{ marginTop: 0 }}>1. Chạy thử hai kịch bản</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={button} disabled={!sessionId || running} onClick={() => start("approval")}>
            Start Approval Agent
          </button>
          <button style={button} disabled={!sessionId || running} onClick={() => start("long")}>
            Start Long Running Agent (12s)
          </button>
          <button style={{ ...button, borderColor: "#dc2626", color: "#b91c1c" }}
            disabled={!running || cancelRequested} onClick={cancel}>
            {cancelRequested ? "Cancel requested..." : "Cancel Agent"}
          </button>
        </div>
        <p style={{ color: "#536179", fontSize: 14, marginBottom: 0 }}>
          Thử: (A) Start Approval → Approve / Reject; (B) Start Approval → Cancel khi còn chờ;
          (C) Start Long Running → Cancel giữa chừng.
        </p>
      </section>

      {pendingApproval && (
        <section style={{ ...card, borderColor: "#d97706", background: "#fffbeb" }}>
          <h2 style={{ marginTop: 0 }}>2. Agent đang await Future!</h2>
          <p>Tool: <strong>{pendingApproval.tool}</strong> · approval_id: <code>{pendingApproval.approval_id}</code></p>
          <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {JSON.stringify(pendingApproval.input, null, 2)}
          </pre>
          <p style={{ fontSize: 14 }}>Bấm một nút để gọi <code>POST /approvals</code> → <code>future.set_result(...)</code>.
            Nếu không bấm, broker tự reject sau {String(pendingApproval.timeout_seconds)} giây.</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={button} disabled={decisionSending || cancelRequested} onClick={() => decide(true)}>Approve (True)</button>
            <button style={button} disabled={decisionSending || cancelRequested} onClick={() => decide(false)}>Reject (False)</button>
          </div>
        </section>
      )}

      <section style={card}>
        <h2 style={{ marginTop: 0 }}>3. Nhận SSE và quan sát Agent</h2>
        <p>Progress: {progress}/20 {progress > 0 ? `(demo long)` : ""}</p>
        <div style={{ background: "#e2e8f0", height: 8, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ background: "#16a34a", height: 8, width: `${progress * 5}%` }} />
        </div>
        <p><strong>Live text:</strong> {liveText || "(Chưa có text_delta)"}</p>
        <p><strong>Final answer:</strong> {answer || "(Chưa có final)"}</p>
        {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
        <h3>Event log ({events.length})</h3>
        <pre style={{ background: "#f1f5f9", padding: 12, borderRadius: 8, whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxHeight: 350, overflow: "auto", fontSize: 13 }}>
          {events.map((event, index) => `${index + 1}. ${JSON.stringify(event)}`).join("\n") || "Waiting for events..."}
        </pre>
        <p style={{ color: "#536179", fontSize: 14 }}>
          Approve: <code>approval_required → approval_decision(true) → permission(allow) → tool_result → final → run_finished</code>.
          Cancel: <code>error(kind=cancelled) → run_finished</code>.
        </p>
      </section>
      <section style={card}>
        <h2 style={{ marginTop: 0 }}>4. Tìm đúng dòng code khi debug</h2>
        <p><code>agent.py</code>: <code>await approver(...)</code> hoặc <code>await asyncio.sleep(...)</code>.</p>
        <p><code>approvals.py</code>: <code>await asyncio.wait_for(future,...)</code> / <code>future.set_result(approved)</code>.</p>
        <p><code>api.py</code>: <code>session.task.cancel()</code> / <code>queue.get()</code> / <code>yield SSE</code>.</p>
        <p><code>approval/page.tsx</code>: <code>reader.read()</code> / <code>decide()</code> / <code>cancel()</code>.</p>
      </section>
    </main>
  );
}
