"use client";
import { useEffect, useRef, useState } from "react";
import { createSession, postAction, startRun, type AgentEvent, type BackendScenario } from "./api";
import type { ReceivedEvent } from "./event-log";

// State của MỘT run: session, event nhận được, approval đang chờ, cancel, lỗi.
// Tách khỏi page.tsx để page chỉ còn phần render.
export function useRun() {
  const createdSession = useRef(false);
  const runStartedAt = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const runningRef = useRef(false);
  const sessionRef = useRef("");
  const [sessionId, setSessionId] = useState("");
  const [sessionError, setSessionError] = useState(""); // Tách khỏi `error` để Reset view không xóa.
  const [events, setEvents] = useState<ReceivedEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<AgentEvent | null>(null);
  const [decisionSending, setDecisionSending] = useState(false);
  const [cancelRequested, setCancelRequested] = useState(false);
  const [answer, setAnswer] = useState("");
  const [liveText, setLiveText] = useState("");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (createdSession.current) return;
    createdSession.current = true;
    createSession().then(setSessionId).catch((e: Error) => setSessionError(e.message));
  }, []);

  useEffect(() => {
    sessionRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => () => {
    abortRef.current?.abort();
    if (runningRef.current && sessionRef.current) {
      void postAction(`/sessions/${sessionRef.current}/cancel`);
    }
  }, []);

  function resetView() {
    setEvents([]);
    setAnswer("");
    setLiveText("");
    setError("");
    setProgress(0);
    setPendingApproval(null);
    setDecisionSending(false);
    setCancelRequested(false);
  }

  function handleEvent(event: AgentEvent) {
    setEvents((old) => [...old, { atMs: performance.now() - runStartedAt.current, event }]);
    // approval_required: agent gửi event này ngay trước khi await Future.
    if (event.type === "approval_required") setPendingApproval(event);
    if (["approval_decision", "approval_timeout", "error", "run_finished"].includes(event.type)) {
      setPendingApproval(null);
      setDecisionSending(false);
    }
    if (event.type === "progress") setProgress(Number(event.step ?? 0));
    if (event.type === "text_delta") setLiveText((old) => old + String(event.text ?? ""));
    if (event.type === "final") setAnswer(String(event.answer ?? ""));
  }

  async function start(text: string, scenario: BackendScenario) {
    if (!sessionId || running || !text.trim()) return;
    setRunning(true);
    runningRef.current = true;
    resetView();
    runStartedAt.current = performance.now();
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await startRun(sessionId, text, scenario, handleEvent, controller.signal);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      runningRef.current = false;
      setRunning(false);
      setPendingApproval(null);
      setDecisionSending(false);
    }
  }

  async function decide(approved: boolean) {
    if (!sessionId || !pendingApproval?.approval_id || decisionSending) return;
    setDecisionSending(true);
    try {
      // Request HTTP KHÁC với /runs đang stream; kết quả quay lại qua event approval_decision.
      await postAction(`/sessions/${sessionId}/approvals/${pendingApproval.approval_id}`, { approved });
    } catch (e) {
      setDecisionSending(false);
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function cancel() {
    if (!sessionId || !running || cancelRequested) return;
    try {
      // Gọi backend cancel Task, KHÔNG chỉ AbortController.abort(). SSE vẫn mở để nhận event cuối.
      await postAction(`/sessions/${sessionId}/cancel`);
      setCancelRequested(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return {
    sessionId, sessionError, events, running, pendingApproval, decisionSending,
    cancelRequested, answer, liveText, error, progress,
    start, decide, cancel, resetView, setError,
  };
}
