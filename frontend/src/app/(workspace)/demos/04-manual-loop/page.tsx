"use client";
import { Alert, Flex, Space, Tag, Typography } from "antd";
import { useEffect, useState } from "react";
import LearningOutcome from "@/components/LearningOutcome";
import { getTasks, resetTasks, type Task } from "./api";
import { OUTCOMES, SCENARIOS, type ScenarioKey } from "./content";
import EventLog from "./event-log";
import ResultCard from "./result-card";
import ScenarioInput from "./scenario-input";
import SourceDebug from "./source-debug";
import TasksTable from "./tasks-table";
import { useLoop } from "./use-loop";

const { Text, Paragraph } = Typography;

export default function ManualLoopDemoPage() {
  const loop = useLoop();
  const [scenarioKey, setScenarioKey] = useState<ScenarioKey>("normal");
  const [prompt, setPrompt] = useState(SCENARIOS.normal.prompt);
  const [maxTurns, setMaxTurns] = useState(SCENARIOS.normal.maxTurns);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);

  // Chỉ đọc DB khi mở trang; không gọi Claude.
  useEffect(() => {
    void loadTasks(getTasks);
  }, []);

  async function loadTasks(action: () => Promise<Task[]>) {
    setTasksLoading(true);
    try {
      setTasks(await action());
    } catch (error) {
      loop.setError(error instanceof Error ? error.message : String(error));
    } finally {
      setTasksLoading(false);
    }
  }

  function changeScenario(key: ScenarioKey) {
    setScenarioKey(key);
    setPrompt(SCENARIOS[key].prompt);
    setMaxTurns(SCENARIOS[key].maxTurns);
    loop.resetView();
  }

  async function run() {
    await loop.run(prompt, maxTurns);
    await loadTasks(getTasks); // Read-back: thấy ngay DB có thay đổi hay không.
  }

  return (
    <Flex vertical gap={16}>
      <div>
        <Text type="secondary">04 · Manual Agent Loop</Text>
        <Typography.Title level={2} style={{ margin: "4px 0 8px" }}>
          Python giữ vòng lặp · model quyết định dừng
        </Typography.Title>
        <Paragraph style={{ marginBottom: 8 }}>
          Demo 03 chỉ có một tool round. Ở đây vòng lặp chạy nhiều lượt: mỗi lượt là một request Claude,
          <Text code>stop_reason</Text> quyết định còn gọi tool hay đã xong, và <Text code>MAX_TURNS</Text> là
          giới hạn an toàn. Tool ghi dữ liệu phải được bạn duyệt trước.
        </Paragraph>
        <Space wrap size={4}>
          <Tag color="geekblue">Claude API thật</Tag>
          <Tag>SQLite thật (scope manual_loop)</Tag>
          <Tag>Approval trước khi ghi</Tag>
          <Tag>session: {loop.sessionId || (loop.sessionError ? "lỗi" : "đang tạo…")}</Tag>
        </Space>
      </div>
      {loop.sessionError && (
        <Alert type="error" showIcon title="Không tạo được session"
          description={`${loop.sessionError}. Chạy backend ở port 9000 (xem README) rồi tải lại trang.`} />
      )}
      <ScenarioInput scenarioKey={scenarioKey} prompt={prompt} maxTurns={maxTurns} running={loop.running}
        sessionReady={!!loop.sessionId} cancelRequested={loop.cancelRequested}
        onScenarioChange={changeScenario} onPromptChange={setPrompt} onMaxTurnsChange={setMaxTurns}
        onRun={run} onCancel={loop.cancel} onReset={loop.resetView} />
      <ResultCard events={loop.events} running={loop.running} historyMessages={loop.historyMessages}
        pendingApproval={loop.pendingApproval} decisionSending={loop.decisionSending}
        cancelRequested={loop.cancelRequested} transportError={loop.error} onDecide={loop.decide} />
      <TasksTable tasks={tasks} loading={tasksLoading} disabled={loop.running}
        onReload={() => void loadTasks(getTasks)} onReset={() => void loadTasks(resetTasks)} />
      <EventLog events={loop.events} running={loop.running} />
      <SourceDebug />
      <LearningOutcome items={OUTCOMES} />
    </Flex>
  );
}
