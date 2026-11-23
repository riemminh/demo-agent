"use client";
import { PlayCircleOutlined, StopOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Flex, Input, Segmented, Space, Typography } from "antd";
import { SCENARIO_KEYS, SCENARIOS, type ScenarioKey } from "./content";

type Props = {
  scenarioKey: ScenarioKey;
  text: string;
  running: boolean;
  sessionReady: boolean;
  cancelRequested: boolean;
  onTextChange: (text: string) => void;
  onScenarioChange: (key: ScenarioKey) => void;
  onStart: () => void;
  onCancel: () => void;
  onReset: () => void;
};

// Khối "Scenario + Input + Run". Không giữ state: mọi action gọi ngược lên page.tsx.
export default function ScenarioInput(props: Props) {
  const { scenarioKey, text, running, sessionReady, cancelRequested } = props;
  const scenario = SCENARIOS[scenarioKey];
  return (
    <Card size="small" title="Scenario & Input">
      <Flex vertical gap={12}>
        <Segmented<ScenarioKey> value={scenarioKey} disabled={running} onChange={props.onScenarioChange}
          options={SCENARIO_KEYS.map((key) => ({ value: key, label: SCENARIOS[key].label }))} />
        <Typography.Paragraph style={{ margin: 0 }}>{scenario.description}</Typography.Paragraph>
        <Space.Compact style={{ maxWidth: 720 }}>
          <Input value={text} onChange={(event) => props.onTextChange(event.target.value)}
            disabled={running} aria-label="Message gửi Agent" maxLength={500} onPressEnter={props.onStart} />
          {/* Khóa khi đang chạy: một session không chạy hai run song song (backend trả 409). */}
          <Button type="primary" icon={<PlayCircleOutlined />} loading={running}
            disabled={!sessionReady || !text.trim()} onClick={props.onStart}>{scenario.startLabel}</Button>
        </Space.Compact>
        <Space wrap>
          <Button danger icon={<StopOutlined />} disabled={!running || cancelRequested} onClick={props.onCancel}>
            {cancelRequested ? "Cancel requested…" : "Cancel Agent"}
          </Button>
          {/* Chỉ xóa kết quả trên màn hình: không gọi backend, không xóa file sandbox. */}
          <Button disabled={running} onClick={props.onReset}>Reset view</Button>
          <Typography.Text type="secondary">Thử: {scenario.try}</Typography.Text>
        </Space>
        {running && <Alert type="info" showIcon
          title="Rời trang lúc đang chạy chỉ đóng stream ở browser; Task backend vẫn chạy tới khi xong hoặc bị Cancel." />}
      </Flex>
    </Card>
  );
}
