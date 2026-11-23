"use client";
import { PlayCircleOutlined, StopOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Flex, Input, InputNumber, Segmented, Space, Tag, Typography } from "antd";
import { SCENARIO_KEYS, SCENARIOS, type ScenarioKey } from "./content";

type Props = {
  scenarioKey: ScenarioKey;
  prompt: string;
  maxTurns: number;
  running: boolean;
  sessionReady: boolean;
  cancelRequested: boolean;
  onScenarioChange: (key: ScenarioKey) => void;
  onPromptChange: (prompt: string) => void;
  onMaxTurnsChange: (maxTurns: number) => void;
  onRun: () => void;
  onCancel: () => void;
  onReset: () => void;
};

export default function ScenarioInput(props: Props) {
  const { scenarioKey, running } = props;
  const scenario = SCENARIOS[scenarioKey];
  return (
    <Card size="small" title="Scenario & Input">
      <Flex vertical gap={12}>
        <Segmented<ScenarioKey> value={scenarioKey} disabled={running} onChange={props.onScenarioChange}
          options={SCENARIO_KEYS.map((key) => ({ value: key, label: SCENARIOS[key].label }))} />
        <Typography.Paragraph style={{ margin: 0 }}>{scenario.description}</Typography.Paragraph>
        <Tag color="blue">Kỳ vọng: {scenario.expect}</Tag>
        <Input.TextArea value={props.prompt} onChange={(event) => props.onPromptChange(event.target.value)}
          disabled={running} rows={2} maxLength={1000} showCount aria-label="Prompt gửi agent loop" />
        <Space wrap>
          <Typography.Text>max_turns</Typography.Text>
          <InputNumber min={1} max={6} value={props.maxTurns} disabled={running}
            onChange={(value) => props.onMaxTurnsChange(value ?? 4)} />
          <Button type="primary" icon={<PlayCircleOutlined />} loading={running}
            disabled={!props.sessionReady || !props.prompt.trim()} onClick={props.onRun}>Run loop</Button>
          <Button danger icon={<StopOutlined />} disabled={!running || props.cancelRequested}
            onClick={props.onCancel}>
            {props.cancelRequested ? "Cancel requested…" : "Cancel"}
          </Button>
          <Button disabled={running} onClick={props.onReset}>Reset view</Button>
        </Space>
        {running && (
          <Alert type="info" showIcon
            title="Mỗi lượt là một request Claude thật; messages dài dần vì phải gửi lại cả assistant tool_use và tool_result." />
        )}
      </Flex>
    </Card>
  );
}
