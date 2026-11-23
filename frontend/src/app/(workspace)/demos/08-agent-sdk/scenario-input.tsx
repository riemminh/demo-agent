"use client";
import { ExperimentOutlined, PlayCircleOutlined, StopOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Flex, Input, Segmented, Space, Tag, Typography } from "antd";
import type { Env, ScenarioName } from "./api";
import { SCENARIO_KEYS, SCENARIOS } from "./content";

type Props = {
  scenario: ScenarioName;
  prompt: string;
  running: boolean;
  inspecting: boolean;
  cancelRequested: boolean;
  sessionReady: boolean;
  env: Env | null;
  onScenarioChange: (scenario: ScenarioName) => void;
  onPromptChange: (prompt: string) => void;
  onInspect: () => void;
  onRun: () => void;
  onCancel: () => void;
  onReset: () => void;
};

export default function ScenarioInput(props: Props) {
  const { scenario, running, inspecting, env } = props;
  const current = SCENARIOS[scenario];
  const missing = env && (!env.cli_found || !env.api_key_configured);
  return (
    <Card size="small" title="Scenario & Input"
      extra={env && <Space size={4} wrap>
        <Tag color={env.cli_found ? "success" : "error"}>
          CLI {env.cli_found ? "ok" : "thiếu"}
        </Tag>
        <Tag>SDK {env.sdk_version}</Tag>
        <Tag>max_turns {env.max_turns}</Tag>
        <Tag>budget ${env.max_budget_usd}</Tag>
      </Space>}>
      <Flex vertical gap={12}>
        {missing && (
          <Alert type="error" showIcon title="Thiếu prerequisite"
            description="Cần Claude Code CLI trong PATH và ANTHROPIC_API_KEY trong backend/.env. Xem mục Setup trong README." />
        )}
        <Segmented<ScenarioName> value={scenario} disabled={running || inspecting}
          onChange={props.onScenarioChange}
          options={SCENARIO_KEYS.map((key) => ({ value: key, label: SCENARIOS[key].label }))} />
        <Typography.Paragraph style={{ margin: 0 }}>{current.description}</Typography.Paragraph>
        <Typography.Text type="secondary">Nhìn vào trace: {current.watch}</Typography.Text>
        <Input.TextArea value={props.prompt} onChange={(event) => props.onPromptChange(event.target.value)}
          disabled={running} rows={2} maxLength={1000} showCount aria-label="Prompt cho SDK agent" />
        <Space wrap>
          <Button icon={<ExperimentOutlined />} loading={inspecting} disabled={running}
            onClick={props.onInspect}>Inspect SDK session (không gọi model)</Button>
          <Button type="primary" icon={<PlayCircleOutlined />} loading={running}
            disabled={!props.sessionReady || !props.prompt.trim() || inspecting}
            onClick={props.onRun}>Run agent</Button>
          <Button danger icon={<StopOutlined />} disabled={!running || props.cancelRequested}
            onClick={props.onCancel}>
            {props.cancelRequested ? "Cancel requested…" : "Cancel"}
          </Button>
          <Button disabled={running} onClick={props.onReset}>Reset view</Button>
        </Space>
        <Typography.Text type="secondary">
          Run có cận trên 45 giây ở backend; Cancel hủy task nên SDK đóng CLI.
        </Typography.Text>
      </Flex>
    </Card>
  );
}
