"use client";
import { useEffect, useRef, useState } from "react";
import { createSession, postAction, startRun, type ScenarioName, type SdkEvent } from "./api";

// State của một run SDK: event, approval đang chờ, cancel, lỗi transport.
export function useSdkRun() {
  const createdSession = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const runningRef = useRef(false);
  const sessionRef = useRef("");
  const [sessionId, setSessionId] = useState("");
  const [sessionError, setSessionError] = useState("");
  const [events, setEvents] = useState<SdkEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<SdkEvent | null>(null);
  const [decisionSending, setDecisionSending] = useState(false);
  const [cancelRequested, setCancelRequested] = useState(false);
  const [error, setError] = useState("");
  const [liveText, setLiveText] = useState("");

  useEffect(() => {
    if (createdSession.current) return;
    createdSession.current = true;
    createSession().then(setSessionId).catch((caught: Error) => setSessionError(caught.message));
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
    setError("");
    setLiveText("");
    setPendingApproval(null);
    setDecisionSending(false);
    setCancelRequested(false);
  }

  function handleEvent(event: SdkEvent) {
    setEvents((old) => [...old, event]);
    if (event.type === "approval_required") setPendingApproval(event);
    if (event.type === "text_delta") setLiveText((old) => old + String(event.text ?? ""));
    if (["approval_decision", "approval_timeout", "error", "run_finished"].includes(event.type)) {
      setPendingApproval(null);
      setDecisionSending(false);
    }
  }

  async function run(scenario: ScenarioName, prompt: string) {
    if (!sessionId || running) return;
    setRunning(true);
    runningRef.current = true;
    resetView();
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await startRun(sessionId, scenario, prompt, handleEvent, controller.signal);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      runningRef.current = false;
      setRunning(false);
      setPendingApproval(null);
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
    sessionId, sessionError, events, running, pendingApproval, decisionSending,
    cancelRequested, error, liveText, run, decide, cancel, resetView, setError,
  };
}
