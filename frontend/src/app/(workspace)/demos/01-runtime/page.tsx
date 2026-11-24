"use client";
import { Alert, Flex, Space, Tag, Typography } from "antd";
import { useState } from "react";
import { readNote, resetNote, type NoteFile } from "./api";
import { SCENARIOS, type ScenarioKey } from "./content";
import EventLog from "./event-log";
import NoteFileCard from "./note-file";
import RunResult from "./run-result";
import ScenarioInput from "./scenario-input";
import SourceDebug from "./source-debug";
import { useRun } from "./use-run";

const { Text, Paragraph } = Typography;

export default function RuntimeDemoPage() {
  const run = useRun();
  const [scenarioKey, setScenarioKey] = useState<ScenarioKey>("sse");
  const [text, setText] = useState(SCENARIOS.sse.preset);
  const [note, setNote] = useState<NoteFile | null>(null);
  const [noteLoading, setNoteLoading] = useState(false);
  const scenario = SCENARIOS[scenarioKey];

  function changeScenario(key: ScenarioKey) {
    setScenarioKey(key);
    setText(SCENARIOS[key].preset);
    run.resetView();
  }

  async function loadNote(action: () => Promise<NoteFile>) {
    setNoteLoading(true);
    try {
      setNote(await action());
    } catch (e) {
      run.setError(e instanceof Error ? e.message : String(e));
    } finally {
      setNoteLoading(false);
    }
  }

  async function start() {
    await run.start(text, scenario.backend);
    // Run xong thì đọc lại file để thấy ngay có side effect hay không.
    if (scenarioKey === "approval") await loadNote(readNote);
  }

  return (
    <Flex vertical gap={16}>
      <div>
        <Text type="secondary">01 · Agent Runtime</Text>
        <Typography.Title level={2} style={{ margin: "4px 0 8px" }}>
          Task · Queue · SSE · Future · Cancel
        </Typography.Title>
        <Paragraph style={{ marginBottom: 8 }}>
          Backend chạy coroutine trong asyncio Task và gửi event tới UI; nó có thể dừng chờ người duyệt
          (Future) hoặc bị cancel. Approve thì agent ghi một file thật để thấy side effect.
        </Paragraph>
        <Space wrap size={4}>
          <Tag color="geekblue">Agent kịch bản, không gọi Claude</Tag>
          <Tag>Thời gian mô phỏng bằng asyncio.sleep</Tag>
          <Tag>session: {run.sessionId || (run.sessionError ? "lỗi" : "đang tạo…")}</Tag>
        </Space>
      </div>
      {run.sessionError && <Alert type="error" showIcon title="Không tạo được session"
        description={`${run.sessionError}. Chạy backend ở port 9000 (xem README) rồi tải lại trang.`} />}
      <ScenarioInput scenarioKey={scenarioKey} text={text} running={run.running} sessionReady={!!run.sessionId}
        cancelRequested={run.cancelRequested} onTextChange={setText} onStart={start} onCancel={run.cancel}
        onReset={run.resetView} onScenarioChange={changeScenario} />
      <RunResult running={run.running} events={run.events} pendingApproval={run.pendingApproval}
        decisionSending={run.decisionSending} cancelRequested={run.cancelRequested} liveText={run.liveText}
        answer={run.answer} error={run.error} progress={run.progress} onDecide={run.decide} />
      {scenarioKey === "approval" && (
        <NoteFileCard note={note} loading={noteLoading} disabled={run.running}
          onRead={() => void loadNote(readNote)} onReset={() => void loadNote(resetNote)} />
      )}
      <EventLog events={run.events} running={run.running} expectedFlow={scenario.expectedFlow} />
      <SourceDebug />
    </Flex>
  );
}
