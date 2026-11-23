"use client";
import { CopyOutlined } from "@ant-design/icons";
import { Alert, App, Button, Card, Descriptions, Empty, Flex, Tag, Typography } from "antd";
import type { ClaudeResult } from "./api";

type Props = {
  result: ClaudeResult | null;
  streamText: string; // Text đang nhận dở trong scenario Streaming.
  running: boolean;
  transportError: string;
};

const STATUS = {
  idle: { color: "default", label: "idle" },
  running: { color: "processing", label: "running" },
  succeeded: { color: "success", label: "succeeded" },
  failed: { color: "error", label: "failed" },
} as const;

// Chỉ hiển thị số đo nhận được từ backend; chưa có thì ghi "n/a", không bịa.
function metric(value: number | null | undefined, suffix = ""): string {
  return value === null || value === undefined ? "n/a" : `${value}${suffix}`;
}

export default function ResultCard({ result, streamText, running, transportError }: Props) {
  const { message } = App.useApp();
  const status = running ? "running" : result ? result.status : "idle";
  const text = result?.answer ?? streamText;
  const stopReason = result?.response?.stop_reason;

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      message.success("Đã copy");
    } catch {
      message.error("Trình duyệt không cho phép copy");
    }
  }

  return (
    <Card size="small" title="Actual Result — text thật từ Claude"
      extra={<Flex gap={8} align="center">
        <Tag color={STATUS[status].color}>{STATUS[status].label}</Tag>
        <Button size="small" icon={<CopyOutlined />} disabled={!text} onClick={copy}>Copy</Button>
      </Flex>}>
      <Flex vertical gap={12}>
        {!text && status === "idle" && <Empty description="Chưa gửi request nào. Bấm Send để gọi Claude." />}
        {text && (
          <Typography.Paragraph style={{ whiteSpace: "pre-wrap", margin: 0 }}>
            {text}
            {running && <Typography.Text type="secondary"> ▍</Typography.Text>}
          </Typography.Paragraph>
        )}
        {result?.error && (
          <Alert type="error" showIcon title={`error(kind=${result.error.kind})`}
            description={result.error.kind === "config_missing"
              ? `${result.error.message}. Điền ANTHROPIC_API_KEY + LLM_MODEL vào backend/.env rồi restart backend; chưa có key thì demo không hiển thị output giả.`
              : `${result.error.message}${result.error.upstream_status ? ` (upstream HTTP ${result.error.upstream_status})` : ""}`} />
        )}
        {transportError && <Alert type="error" showIcon title="Lỗi request từ browser" description={transportError} />}
        {result && (
          <Descriptions size="small" column={{ xs: 1, md: 3 }} bordered items={[
            { key: "stop", label: "stop_reason", children: stopReason ? <Tag>{String(stopReason)}</Tag> : "n/a" },
            { key: "api", label: "API calls", children: metric(result.metrics.api_calls) },
            { key: "latency", label: "Latency", children: metric(result.metrics.latency_ms, " ms") },
            { key: "in", label: "input_tokens", children: metric(result.metrics.input_tokens) },
            { key: "out", label: "output_tokens", children: metric(result.metrics.output_tokens) },
            { key: "model", label: "model", children: String(result.response?.model ?? result.request?.model ?? "n/a") },
          ]} />
        )}
      </Flex>
    </Card>
  );
}
