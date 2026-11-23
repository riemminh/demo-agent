"use client";

import { Alert, Flex, Space, Tag, Typography } from "antd";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import LearningOutcome from "@/components/LearningOutcome";
import { API_URL } from "@/lib/api";
import { OUTCOMES, SCENARIOS, parseScenario } from "./content";
import EventLog, { type ReceivedEvent } from "./event-log";
import RunResult from "./run-result";
import { createSession, postAction, streamMessage, type AgentEvent } from "./runtime-api";
import ScenarioInput from "./scenario-input";
import SourceDebug from "./source-debug";

const { Text, Paragraph } = Typography;

// Logic start/handleEvent/decide/cancel giữ nguyên từ approval/page.tsx (legacy); web.tsx là scenario "sse".
export default function RuntimeDemo() {
  const router = useRouter();
  const scenarioKey = parseScenario(useSearchParams().get("scenario")); // URL là nguồn sự thật.
  const scenario = SCENARIOS[scenarioKey];

  const initialized = useRef(false);
  const runStartedAt = useRef(0);
  const [sessionId, setSessionId] = useState("");
  const [sessionError, setSessionError] = useState(""); // Tách khỏi `error` để Reset view không xóa mất.
  const [text, setText] = useState(scenario.preset);
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
    if (initialized.current) return; // Strict Mode chạy effect 2 lần ở dev: chỉ tạo 1 session.
    initialized.current = true;
    // Chỉ tạo session trong RAM backend; KHÔNG chạy agent khi mở trang hay reload URL.
    createSession().then(setSessionId).catch((e: Error) => setSessionError(e.message));
  }, []);

  // Đổi scenario (Segmented, back/forward): xóa kết quả cũ trên màn hình và nạp câu mẫu mới.
  // Đang chạy thì giữ nguyên để không mất event của run hiện tại.
  useEffect(() => {
    if (running) return;
    setText(SCENARIOS[scenarioKey].preset);
    resetView();
  }, [scenarioKey]);

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
    // approval_required: Agent gửi lên trước khi await Future.
    if (event.type === "approval_required") setPendingApproval(event);
    if (event.type === "approval_decision" || event.type === "approval_timeout" || event.type === "run_finished") {
      setPendingApproval(null);
      setDecisionSending(false);
    }
    if (event.type === "progress") setProgress(Number(event.step ?? 0));
    if (event.type === "text_delta") setLiveText((old) => old + String(event.text ?? ""));
    if (event.type === "final") setAnswer(String(event.answer ?? ""));
  }

  async function start() {
    if (!sessionId || running || !text.trim()) return;
    setRunning(true);
    resetView();
    runStartedAt.current = performance.now();
    try {
      // Backend không await Agent trong handler: create_task() cho phép stream ngay.
      await streamMessage(sessionId, text, scenario.backend, handleEvent);
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
      // HTTP request KHÁC với /messages SSE đang chạy. Kết quả chờ SSE approval_decision.
      await postAction(`${API_URL}/api/sessions/${sessionId}/approvals/${pendingApproval.approval_id}`, { approved });
    } catch (e) {
      setDecisionSending(false);
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function cancel() {
    if (!sessionId || !running || cancelRequested) return;
    try {
      // Gọi backend cancel Task, KHÔNG chỉ AbortController.abort(). SSE vẫn mở để nhận event cuối.
      await postAction(`${API_URL}/api/sessions/${sessionId}/cancel`);
      setCancelRequested(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Flex vertical gap={16}>
      <div>
        <Text type="secondary">01 · Agent Runtime</Text>
        <Typography.Title level={2} style={{ margin: "4px 0 8px" }}>Task · Queue · SSE · Future · Cancel</Typography.Title>
        <Paragraph style={{ marginBottom: 8 }}>
          Quan sát vòng đời một run: backend tạo asyncio Task, Agent emit event qua Queue, browser đọc SSE;
          Approval chờ bằng Future, Cancel hủy Task ở backend.
        </Paragraph>
        <Space wrap size={4}>
          <Tag color="geekblue">Agent kịch bản, không gọi Claude</Tag>
          <Tag>Timing có kiểm soát (asyncio.sleep)</Tag>
          <Tag>session: {sessionId || (sessionError ? "lỗi" : "đang tạo…")}</Tag>
        </Space>
      </div>
      {sessionError && <Alert type="error" showIcon title="Không tạo được session"
        description={`${sessionError}. Chạy backend ở port 9000 (xem README) rồi tải lại trang.`} />}

      <ScenarioInput scenarioKey={scenarioKey} text={text} running={running} sessionReady={!!sessionId}
        cancelRequested={cancelRequested} onTextChange={setText} onStart={start} onCancel={cancel}
        onReset={resetView} onScenarioChange={(key) => router.replace(`/runtime?scenario=${key}`, { scroll: false })} />

      <RunResult scenarioKey={scenarioKey} running={running} events={events} pendingApproval={pendingApproval}
        decisionSending={decisionSending} cancelRequested={cancelRequested} liveText={liveText}
        answer={answer} error={error} progress={progress} onDecide={decide} />
      <EventLog events={events} running={running} expectedFlow={scenario.expectedFlow} />
      <SourceDebug />
      <LearningOutcome items={OUTCOMES} />
    </Flex>
  );
}
