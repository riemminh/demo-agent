"use client";
import { useEffect, useRef, useState } from "react";
import { createSession, getSession, postAction, startRun, type LoopEvent } from "./api";

// State của một run loop: session, event backend, approval đang chờ, cancel.
export function useLoop() {
  const createdSession = useRef(false);
  const [sessionId, setSessionId] = useState("");
  const [sessionError, setSessionError] = useState("");
  const [historyMessages, setHistoryMessages] = useState(0);
  const [events, setEvents] = useState<LoopEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<LoopEvent | null>(null);
  const [decisionSending, setDecisionSending] = useState(false);
  const [cancelRequested, setCancelRequested] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (createdSession.current) return; // Strict Mode gọi effect 2 lần ở dev.
    createdSession.current = true;
    createSession().then(setSessionId).catch((e: Error) => setSessionError(e.message));
  }, []);

  function resetView() {
    setEvents([]);
    setError("");
    setPendingApproval(null);
    setDecisionSending(false);
    setCancelRequested(false);
  }

  function handleEvent(event: LoopEvent) {
    setEvents((old) => [...old, event]);
    if (event.type === "approval_required") setPendingApproval(event);
    if (["approval_decision", "approval_timeout", "error", "run_finished"].includes(event.type)) {
      setPendingApproval(null);
      setDecisionSending(false);
    }
  }

  async function run(prompt: string, maxTurns: number) {
    if (!sessionId || running) return;
    setRunning(true);
    resetView();
    try {
      await startRun(sessionId, prompt, maxTurns, handleEvent);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setRunning(false);
      setPendingApproval(null);
      // history_messages đọc lại từ backend: thấy rõ run nào commit, run nào không.
      getSession(sessionId).then((state) => setHistoryMessages(state.history_messages)).catch(() => {});
    }
  }

  async function decide(approved: boolean) {
    if (!sessionId || !pendingApproval?.approval_id || decisionSending) return;
    setDecisionSending(true);
    try {
      await postAction(`/sessions/${sessionId}/approvals/${pendingApproval.approval_id}`, { approved });
    } catch (caught) {
      setDecisionSending(false);
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  async function cancel() {
    if (!sessionId || !running || cancelRequested) return;
    try {
      await postAction(`/sessions/${sessionId}/cancel`);
      setCancelRequested(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  return {
    sessionId, sessionError, historyMessages, events, running, pendingApproval,
    decisionSending, cancelRequested, error, run, decide, cancel, resetView, setError,
  };
}
