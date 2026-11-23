"use client";
import { PlayCircleOutlined } from "@ant-design/icons";
import { Button, Card, Flex, Input, Segmented, Space, Tag, Typography } from "antd";
import type { Caps, PatternName } from "./api";
import { PATTERN_KEYS, PATTERNS } from "./content";

type Props = {
  pattern: PatternName;
  input: string;
  running: boolean;
  caps: Caps | null;
  onPatternChange: (pattern: PatternName) => void;
  onInputChange: (input: string) => void;
  onRun: () => void;
  onReset: () => void;
};

export default function ScenarioInput(props: Props) {
  const { pattern, running, caps } = props;
  const current = PATTERNS[pattern];
  return (
    <Card size="small" title="Pattern & Input">
      <Flex vertical gap={12}>
        <Segmented<PatternName> value={pattern} disabled={running} onChange={props.onPatternChange}
          options={PATTERN_KEYS.map((key) => ({ value: key, label: PATTERNS[key].label }))} />
        <Typography.Paragraph style={{ margin: 0 }}>{current.oneLiner}</Typography.Paragraph>
        <Space wrap size={4}>
          <Tag color="blue">Ai quyết định: {current.whoDecides}</Tag>
          {caps && <Tag>budget: {caps.budgets[pattern]} API call</Tag>}
          {caps && pattern === "orchestrator" && <Tag>MAX_WORKERS = {caps.max_workers}</Tag>}
          {caps && pattern === "evaluator" && <Tag>MAX_REVISIONS = {caps.max_revisions}</Tag>}
        </Space>
        <Typography.Text type="secondary">Nhìn vào trace: {current.watch}</Typography.Text>
        <Space wrap>
          <Typography.Text type="secondary">Input mẫu:</Typography.Text>
          {current.presets.map((preset) => (
            <Button key={preset} size="small" disabled={running}
              onClick={() => props.onInputChange(preset)}>
              {preset.length > 44 ? `${preset.slice(0, 44)}…` : preset}
            </Button>
          ))}
        </Space>
        <Input.TextArea value={props.input} onChange={(event) => props.onInputChange(event.target.value)}
          disabled={running} rows={2} maxLength={1000} showCount aria-label="Input cho workflow" />
        <Space wrap>
          <Button type="primary" icon={<PlayCircleOutlined />} loading={running}
            disabled={!props.input.trim()} onClick={props.onRun}>Run workflow</Button>
          <Button disabled={running} onClick={props.onReset}>Reset view</Button>
          <Typography.Text type="secondary">
            Backend enforce budget: pattern xin thêm call là raise BudgetExceeded (HTTP 409).
          </Typography.Text>
        </Space>
      </Flex>
    </Card>
  );
}
