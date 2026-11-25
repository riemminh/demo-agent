"use client";
import { Alert, Flex, Space, Tag, Typography } from "antd";
import { useEffect, useState } from "react";
import {
  getEnv, getTasks, inspectScenario, resetTasks,
  type Env, type Inspection, type ScenarioName, type Task,
} from "./api";
import EventLog from "./event-log";
import InspectCard from "./inspect-card";
import ResultCard from "./result-card";
import ScenarioInput from "./scenario-input";
import SourceDebug from "./source-debug";
import TasksPanel from "./tasks-panel";
import { useSdkRun } from "./use-sdk-run";

const { Text, Paragraph } = Typography;

export default function AgentSdkDemoPage() {
  const sdk = useSdkRun();
  const [env, setEnv] = useState<Env | null>(null);
  const [scenario, setScenario] = useState<ScenarioName>("basic");
  const [prompt, setPrompt] = useState("");
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);

  // Chỉ đọc prerequisites + DB khi mở trang; không spawn CLI, không gọi model.
  useEffect(() => {
    getEnv().then((loaded) => {
      setEnv(loaded);
      setPrompt(loaded.scenarios.basic.prompt);
    }).catch((error: Error) => sdk.setError(error.message));
    void loadTasks(getTasks);
  }, []);

  async function loadTasks(action: () => Promise<Task[]>) {
    setTasksLoading(true);
    try {
      setTasks(await action());
    } catch (error) {
      sdk.setError(error instanceof Error ? error.message : String(error));
    } finally {
      setTasksLoading(false);
    }
  }

  function changeScenario(next: ScenarioName) {
    setScenario(next);
    setPrompt(env?.scenarios[next].prompt ?? "");
    setInspection(null);
    sdk.resetView();
  }

  async function inspect() {
    setInspecting(true);
    try {
      setInspection(await inspectScenario(scenario));
    } catch (error) {
      sdk.setError(error instanceof Error ? error.message : String(error));
    } finally {
      setInspecting(false);
    }
  }

  async function run() {
    await sdk.run(scenario, prompt);
    await loadTasks(getTasks); // Read-back sau run: thấy ngay có ghi DB hay không.
  }

  return (
    <Flex vertical gap={16}>
      <div>
        <Text type="secondary">08 · Claude Agent SDK</Text>
        <Typography.Title level={2} style={{ margin: "4px 0 8px" }}>
          SDK giữ vòng lặp · app giữ quyền
        </Typography.Title>
        <Paragraph style={{ marginBottom: 8 }}>
          Demo 04 là vòng lặp mình tự viết. Ở đây Agent SDK (qua Claude Code CLI) chạy vòng lặp đó,
          còn ứng dụng vẫn quyết định: tool nào được dùng, tool ghi có được phép hay không
          (<Text code>can_use_tool</Text>), hook nào quan sát, skill và subagent nào được khai báo.
        </Paragraph>
        <Space wrap size={4}>
          <Tag color="geekblue">claude-agent-sdk {env?.sdk_version ?? "…"}</Tag>
          <Tag>tool in-process (create_sdk_mcp_server)</Tag>
          <Tag>setting_sources=[] — không nạp config cá nhân</Tag>
          <Tag>SQLite scope agent_sdk</Tag>
        </Space>
      </div>
      {sdk.sessionError && (
        <Alert type="error" showIcon title="Không tạo được session"
          description={`${sdk.sessionError}. Chạy backend ở port 9000 (xem README) rồi tải lại trang.`} />
      )}
      <ScenarioInput scenario={scenario} prompt={prompt} running={sdk.running} inspecting={inspecting}
        cancelRequested={sdk.cancelRequested} sessionReady={!!sdk.sessionId} env={env}
        onScenarioChange={changeScenario} onPromptChange={setPrompt} onInspect={inspect}
        onRun={run} onCancel={sdk.cancel} onReset={() => { setInspection(null); sdk.resetView(); }} />
      <InspectCard inspection={inspection} />
      <ResultCard events={sdk.events} liveText={sdk.liveText} running={sdk.running} pendingApproval={sdk.pendingApproval}
        decisionSending={sdk.decisionSending} cancelRequested={sdk.cancelRequested}
        transportError={sdk.error} onDecide={sdk.decide} />
      <TasksPanel tasks={tasks} loading={tasksLoading} disabled={sdk.running}
        onReload={() => void loadTasks(getTasks)} onReset={() => void loadTasks(resetTasks)} />
      <EventLog events={sdk.events} running={sdk.running} />
      <SourceDebug />
    </Flex>
  );
}
