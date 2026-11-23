"use client";
import { CheckCircleOutlined, ThunderboltOutlined, ToolOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Flex, Input, Space, Tooltip, Typography } from "antd";
import { MONO_FONT } from "@/theme/theme";
import { BAD_DRAFTS, PROMPT_PRESETS } from "./content";

type Props = {
  prompt: string;
  draftJson: string;
  jsonError: string;
  busy: "generate" | "validate" | "repair" | null;
  canRepair: boolean;
  onPromptChange: (prompt: string) => void;
  onDraftJsonChange: (json: string) => void;
  onGenerate: () => void;
  onValidate: () => void;
  onRepair: () => void;
  onReset: () => void;
};

// Ba hành động theo đúng thứ tự của bài: Generate (Claude) → Validate (Python) → Repair (Claude, 1 lần).
export default function DraftEditor(props: Props) {
  const { busy } = props;
  return (
    <Card size="small" title="Input & Actions">
      <Flex vertical gap={12}>
        <Typography.Text strong>1 · Generate — yêu cầu bằng tiếng Việt</Typography.Text>
        <Space wrap>
          {PROMPT_PRESETS.map((preset) => (
            <Button key={preset} size="small" disabled={!!busy}
              onClick={() => props.onPromptChange(preset)}>
              {preset.length > 40 ? `${preset.slice(0, 40)}…` : preset}
            </Button>
          ))}
        </Space>
        <Space.Compact style={{ width: "100%" }}>
          <Input value={props.prompt} onChange={(event) => props.onPromptChange(event.target.value)}
            disabled={!!busy} maxLength={1000} aria-label="Yêu cầu tạo task" />
          <Button type="primary" icon={<ThunderboltOutlined />} loading={busy === "generate"}
            disabled={!props.prompt.trim() || !!busy} onClick={props.onGenerate}>Generate</Button>
        </Space.Compact>

        <Typography.Text strong>2 · Validate — sửa JSON rồi kiểm tra (không gọi Claude)</Typography.Text>
        <Space wrap>
          <Typography.Text type="secondary">Nạp JSON sai sẵn:</Typography.Text>
          {BAD_DRAFTS.map((bad) => (
            <Tooltip key={bad.label} title={bad.why}>
              <Button size="small" disabled={!!busy} onClick={() => props.onDraftJsonChange(bad.json)}>
                {bad.label}
              </Button>
            </Tooltip>
          ))}
        </Space>
        <Input.TextArea value={props.draftJson} onChange={(event) => props.onDraftJsonChange(event.target.value)}
          disabled={!!busy} rows={7} spellCheck={false} aria-label="TaskDraft JSON"
          style={{ fontFamily: MONO_FONT, fontSize: 13.5 }} />
        {props.jsonError && <Alert type="error" showIcon title="JSON không parse được ở browser"
          description={props.jsonError} />}
        <Space wrap>
          <Button icon={<CheckCircleOutlined />} loading={busy === "validate"}
            disabled={!props.draftJson.trim() || !!busy} onClick={props.onValidate}>Validate</Button>
          <Button icon={<ToolOutlined />} loading={busy === "repair"} disabled={!props.canRepair || !!busy}
            onClick={props.onRepair}>Repair một lần (gọi Claude)</Button>
          <Button disabled={!!busy} onClick={props.onReset}>Reset view</Button>
          <Typography.Text type="secondary">
            Repair chỉ bật khi đang có lỗi; mỗi lần bấm là đúng một request.
          </Typography.Text>
        </Space>
      </Flex>
    </Card>
  );
}
