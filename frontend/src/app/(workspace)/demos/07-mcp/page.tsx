"use client";
import { Flex, Space, Tag, Typography } from "antd";
import { useEffect, useState } from "react";
import LearningOutcome from "@/components/LearningOutcome";
import {
  callTool, discover, getTasks, resetTasks, resourcesPrompts, seedTasks,
  type DiscoverResult, type McpEvent, type ResourcesPromptsResult, type Task, type ToolCallResult,
} from "./api";
import { OUTCOMES, type ScenarioKey } from "./content";
import EventLog from "./event-log";
import ResultCard from "./result-card";
import ScenarioInput from "./scenario-input";
import SourceDebug from "./source-debug";
import TasksPanel from "./tasks-panel";

const { Text, Paragraph } = Typography;

export default function McpDemoPage() {
  const [scenario, setScenario] = useState<ScenarioKey>("discover");
  const [toolName, setToolName] = useState<"list_tasks" | "get_task">("list_tasks");
  const [taskId, setTaskId] = useState(1);
  const [goal, setGoal] = useState("thêm 2FA cho trang đăng nhập");
  const [discovered, setDiscovered] = useState<DiscoverResult | null>(null);
  const [toolCall, setToolCall] = useState<ToolCallResult | null>(null);
  const [resources, setResources] = useState<ResourcesPromptsResult | null>(null);
  const [events, setEvents] = useState<McpEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);

  useEffect(() => {
    void loadTasks(getTasks); // Chỉ đọc DB; không mở session MCP khi vào trang.
  }, []);

  async function loadTasks(action: () => Promise<Task[]>) {
    setTasksLoading(true);
    try {
      setTasks(await action());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setTasksLoading(false);
    }
  }

  function reset() {
    setDiscovered(null);
    setToolCall(null);
    setResources(null);
    setEvents([]);
    setError("");
  }

  function changeScenario(next: ScenarioKey) {
    setScenario(next);
    reset();
  }

  async function run() {
    setRunning(true);
    setError("");
    try {
      if (scenario === "discover") {
        const result = await discover();
        setDiscovered(result);
        setEvents(result.events);
      } else if (scenario === "call") {
        const result = await callTool(toolName, toolName === "get_task" ? taskId : undefined);
        setToolCall(result);
        setEvents(result.events);
        setTasks(result.db_tasks); // Bridge trả kèm DB để đối chiếu.
      } else {
        const result = await resourcesPrompts(goal);
        setResources(result);
        setEvents(result.events);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setEvents([]);
    } finally {
      setRunning(false);
    }
  }

  const session = discovered?.session ?? toolCall?.session ?? resources?.session ?? null;

  return (
    <Flex vertical gap={16}>
      <div>
        <Text type="secondary">07 · MCP</Text>
        <Typography.Title level={2} style={{ margin: "4px 0 8px" }}>
          Server riêng · client khám phá và gọi qua protocol
        </Typography.Title>
        <Paragraph style={{ marginBottom: 8 }}>
          Tool ở đây không nằm trong process web: nó là một MCP server riêng, nói chuyện bằng
          JSON-RPC trên stdio. Client phải <Text code>initialize</Text>, hỏi <Text code>tools/list</Text>,
          rồi mới gọi được. Demo này chạy hoàn toàn không cần Claude key.
        </Paragraph>
        <Space wrap size={4}>
          <Tag color="geekblue">MCP Python SDK 2.x (MCPServer)</Tag>
          <Tag>transport: stdio</Tag>
          <Tag>server cố định trong code</Tag>
          <Tag>SQLite scope mcp (chỉ đọc)</Tag>
        </Space>
      </div>
      <ScenarioInput scenario={scenario} toolName={toolName} taskId={taskId} goal={goal}
        running={running} session={session} onScenarioChange={changeScenario}
        onToolNameChange={setToolName} onTaskIdChange={setTaskId} onGoalChange={setGoal}
        onRun={run} onReset={reset} />
      <ResultCard scenario={scenario} discovered={discovered} toolCall={toolCall}
        resources={resources} running={running} error={error} />
      <TasksPanel tasks={tasks} loading={tasksLoading} disabled={running}
        onReload={() => void loadTasks(getTasks)} onSeed={() => void loadTasks(seedTasks)}
        onReset={() => void loadTasks(resetTasks)} />
      <EventLog events={events} running={running} />
      <SourceDebug />
      <LearningOutcome items={OUTCOMES} />
    </Flex>
  );
}
