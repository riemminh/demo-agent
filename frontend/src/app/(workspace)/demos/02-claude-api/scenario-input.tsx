"use client";
import { SendOutlined } from "@ant-design/icons";
import { Button, Card, Collapse, Flex, Input, InputNumber, Segmented, Space, Switch, Tag, Typography } from "antd";
import { SCENARIO_KEYS, SCENARIOS, type ScenarioKey } from "./content";

type Props = {
  scenarioKey: ScenarioKey;
  prompt: string;
  system: string;
  maxTokens: number;
  includeHistory: boolean;
  turnCount: number;
  running: boolean;
  onScenarioChange: (key: ScenarioKey) => void;
  onPromptChange: (prompt: string) => void;
  onSystemChange: (system: string) => void;
  onMaxTokensChange: (maxTokens: number) => void;
  onIncludeHistoryChange: (include: boolean) => void;
  onSend: () => void;
  onReset: () => void;
};

export default function ScenarioInput(props: Props) {
  const { scenarioKey, running, turnCount } = props;
  const scenario = SCENARIOS[scenarioKey];
  return (
    <Card size="small" title="Scenario & Input">
      <Flex vertical gap={12}>
        <Segmented<ScenarioKey> value={scenarioKey} disabled={running} onChange={props.onScenarioChange}
          options={SCENARIO_KEYS.map((key) => ({ value: key, label: SCENARIOS[key].label }))} />
        <Typography.Paragraph style={{ margin: 0 }}>{scenario.description}</Typography.Paragraph>
        <Space wrap>
          <Typography.Text type="secondary">Preset:</Typography.Text>
          {scenario.presets.map((preset) => (
            <Button key={preset.label} size="small" disabled={running}
              onClick={() => props.onPromptChange(preset.prompt)}>{preset.label}</Button>
          ))}
        </Space>
        <Input.TextArea value={props.prompt} onChange={(event) => props.onPromptChange(event.target.value)}
          disabled={running} rows={3} maxLength={4000} showCount aria-label="Prompt gửi Claude" />
        {scenarioKey === "history" && (
          <Space wrap>
            {/* Chỉ đổi mảng messages của request kế tiếp; không có "memory" nào ở phía Claude. */}
            <Switch checked={props.includeHistory} disabled={running}
              onChange={props.onIncludeHistoryChange} />
            <Typography.Text>Gửi kèm history ({turnCount} turn đã lưu ở frontend)</Typography.Text>
            <Tag color={props.includeHistory ? "blue" : "default"}>
              messages[] = {props.includeHistory ? `${turnCount} turn trước + câu mới` : "chỉ câu mới"}
            </Tag>
          </Space>
        )}
        <Collapse size="small" items={[{
          key: "advanced",
          label: "Advanced — system prompt & max_tokens",
          children: (
            <Flex vertical gap={8}>
              <Input.TextArea value={props.system} onChange={(event) => props.onSystemChange(event.target.value)}
                disabled={running} rows={2} maxLength={2000}
                placeholder="system (tùy chọn) — tham số top-level, không phải một role trong messages" />
              <Space>
                <Typography.Text>max_tokens</Typography.Text>
                <InputNumber min={1} max={4096} value={props.maxTokens} disabled={running}
                  onChange={(value) => props.onMaxTokensChange(value ?? 512)} />
                <Typography.Text type="secondary">
                  Đặt nhỏ (vd 16) để thấy stop_reason thật là max_tokens. Trần do LLM_MAX_TOKENS ở backend.
                </Typography.Text>
              </Space>
            </Flex>
          ),
        }]} />
        <Space wrap>
          <Button type="primary" icon={<SendOutlined />} loading={running}
            disabled={!props.prompt.trim()} onClick={props.onSend}>{scenario.sendLabel}</Button>
          <Button disabled={running} onClick={props.onReset}>
            {scenarioKey === "history" ? "Reset view + history" : "Reset view"}
          </Button>
          <Typography.Text type="secondary">Mỗi lần Send = đúng một request tới Claude (max_retries=0).</Typography.Text>
        </Space>
      </Flex>
    </Card>
  );
}
