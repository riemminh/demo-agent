"use client";
import { ApiOutlined } from "@ant-design/icons";
import { Button, Card, Flex, Input, InputNumber, Segmented, Space, Tag, Typography } from "antd";
import type { Session } from "./api";
import { SCENARIO_KEYS, SCENARIOS, type ScenarioKey } from "./content";

type Props = {
  scenario: ScenarioKey;
  toolName: "list_tasks" | "get_task";
  taskId: number;
  goal: string;
  running: boolean;
  session: Session | null;
  onScenarioChange: (scenario: ScenarioKey) => void;
  onToolNameChange: (name: "list_tasks" | "get_task") => void;
  onTaskIdChange: (taskId: number) => void;
  onGoalChange: (goal: string) => void;
  onRun: () => void;
  onReset: () => void;
};

export default function ScenarioInput(props: Props) {
  const { scenario, running, session } = props;
  const current = SCENARIOS[scenario];
  return (
    <Card size="small" title="Scenario & Input"
      extra={session
        ? <Space size={4}>
            <Tag color="success">Connected</Tag>
            <Tag>{session.server_name}</Tag>
            <Tag>protocol {session.protocol_version}</Tag>
          </Space>
        : <Tag>Chưa connect</Tag>}>
      <Flex vertical gap={12}>
        <Segmented<ScenarioKey> value={scenario} disabled={running} onChange={props.onScenarioChange}
          options={SCENARIO_KEYS.map((key) => ({ value: key, label: SCENARIOS[key].label }))} />
        <Typography.Paragraph style={{ margin: 0 }}>{current.description}</Typography.Paragraph>
        {scenario === "call" && (
          <Space wrap>
            <Segmented<"list_tasks" | "get_task"> value={props.toolName} disabled={running}
              onChange={props.onToolNameChange}
              options={[{ value: "list_tasks", label: "list_tasks" },
                        { value: "get_task", label: "get_task" }]} />
            {props.toolName === "get_task" && (
              <Space>
                <Typography.Text>task_id</Typography.Text>
                <InputNumber min={1} value={props.taskId} disabled={running}
                  onChange={(value) => props.onTaskIdChange(value ?? 1)} />
                <Typography.Text type="secondary">
                  Thử một id không tồn tại (vd 999999) để thấy tool error thật.
                </Typography.Text>
              </Space>
            )}
          </Space>
        )}
        {scenario === "resources" && (
          <Space.Compact style={{ maxWidth: 520 }}>
            <Input value={props.goal} onChange={(event) => props.onGoalChange(event.target.value)}
              disabled={running} maxLength={200} aria-label="Goal cho prompt plan_task"
              placeholder="goal cho prompt plan_task" />
          </Space.Compact>
        )}
        <Space wrap>
          <Button type="primary" icon={<ApiOutlined />} loading={running} onClick={props.onRun}>
            {current.action}
          </Button>
          <Button disabled={running} onClick={props.onReset}>Reset view</Button>
          <Typography.Text type="secondary">
            Mỗi lần bấm là một session MCP mới: spawn server → initialize → gọi → đóng subprocess.
          </Typography.Text>
        </Space>
      </Flex>
    </Card>
  );
}
