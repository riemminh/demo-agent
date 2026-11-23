"use client";
import { PlayCircleOutlined } from "@ant-design/icons";
import { Button, Card, Flex, Input, Segmented, Space, Tag, Typography } from "antd";
import type { ScenarioName } from "./api";
import { SCENARIO_KEYS, SCENARIOS } from "./content";

type Props = {
  scenario: ScenarioName;
  prompt: string;
  running: boolean;
  onScenarioChange: (scenario: ScenarioName) => void;
  onPromptChange: (prompt: string) => void;
  onRun: () => void;
  onReset: () => void;
};

export default function ScenarioInput(props: Props) {
  const { scenario, running } = props;
  const current = SCENARIOS[scenario];
  return (
    <Card size="small" title="Scenario & Input">
      <Flex vertical gap={12}>
        <Segmented<ScenarioName> value={scenario} disabled={running} onChange={props.onScenarioChange}
          options={SCENARIO_KEYS.map((key) => ({ value: key, label: SCENARIOS[key].label }))} />
        <Typography.Paragraph style={{ margin: 0 }}>{current.description}</Typography.Paragraph>
        <Space wrap size={4}>
          <Tag color="blue">tools gửi cho model: {current.toolsSent}</Tag>
          <Tag>{current.toolChoice}</Tag>
        </Space>
        <Space wrap>
          <Typography.Text type="secondary">Prompt mẫu:</Typography.Text>
          {current.presets.map((preset) => (
            <Button key={preset} size="small" disabled={running}
              onClick={() => props.onPromptChange(preset)}>
              {preset.length > 42 ? `${preset.slice(0, 42)}…` : preset}
            </Button>
          ))}
        </Space>
        <Input.TextArea value={props.prompt} onChange={(event) => props.onPromptChange(event.target.value)}
          disabled={running} rows={2} maxLength={2000} showCount aria-label="Prompt gửi Claude" />
        <Space wrap>
          <Button type="primary" icon={<PlayCircleOutlined />} loading={running}
            disabled={!props.prompt.trim()} onClick={props.onRun}>Run</Button>
          <Button disabled={running} onClick={props.onReset}>Reset view</Button>
          <Typography.Text type="secondary">
            Một lần Run = tối đa 2 request Claude (lần 2 chỉ xảy ra khi có tool_use).
          </Typography.Text>
        </Space>
      </Flex>
    </Card>
  );
}
