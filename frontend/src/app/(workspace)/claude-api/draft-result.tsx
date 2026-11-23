"use client";

import { CopyOutlined, UndoOutlined } from "@ant-design/icons";
import { Alert, App, Button, Card, Empty, Flex, Input, Result, Space, Spin, Tag, Typography } from "antd";
import type { RunRecord } from "./types";

type Props = {
  run: RunRecord | null;
  running: boolean;
  draft: string; // Bản đang hiển thị: ban đầu = answer của Claude, người dùng có thể sửa.
  onDraftChange: (text: string) => void;
};

const STATUS = {
  idle: { color: "default", label: "idle" },
  running: { color: "processing", label: "running" },
  succeeded: { color: "success", label: "succeeded" },
  failed: { color: "error", label: "failed" },
} as const;

export default function DraftResult({ run, running, draft, onDraftChange }: Props) {
  const { message } = App.useApp();
  const result = run?.result ?? null;
  const answer = result?.answer ?? "";
  const status = running ? "running" : !run ? "idle" : result?.status === "succeeded" ? "succeeded" : "failed";
  const edited = status === "succeeded" && draft !== answer;

  async function copy() {
    try {
      await navigator.clipboard.writeText(draft);
      message.success("Đã copy draft");
    } catch {
      message.error("Trình duyệt không cho phép copy");
    }
  }

  function body() {
    if (running) return <Spin description="Đang chờ Claude trả lời…"><div style={{ height: 240 }} /></Spin>;
    if (!run) {
      return <Empty style={{ padding: "48px 0" }}
        description="Chưa có draft. Nhập nội dung bên trái rồi bấm Generate: text Claude trả về sẽ hiện ở đây." />;
    }
    if (!result || result.status === "failed") {
      const error = result?.error;
      const upstream = error?.upstream_status ? ` · Anthropic HTTP ${error.upstream_status}` : "";
      return <Result status="error" title={error ? `Lỗi ${error.kind}${upstream}` : "Request không thành công"}
        subTitle={<>{error?.message ?? run.clientError}<br />Backend HTTP {run.httpStatus ?? "n/a"} · Không có draft nào được tạo.</>} />;
    }
    const response = result.response;
    return (
      <Flex vertical gap={12}>
        {response?.stop_reason === "max_tokens" && <Alert type="warning" showIcon
          title="stop_reason = max_tokens: output bị cắt giữa chừng, chưa phải bản hoàn chỉnh" />}
        {answer
          ? <Input.TextArea value={draft} onChange={(e) => onDraftChange(e.target.value)}
              autoSize={{ minRows: 12, maxRows: 28 }} style={{ fontSize: 15, lineHeight: 1.6 }} />
          : <Empty description={`Response không có block text (content: ${response?.content.map((b) => b.type).join(", ") || "rỗng"}). Xem tab Response JSON.`} />}
        <Space wrap size={[4, 4]}>
          <Tag color={response?.stop_reason === "end_turn" ? "success" : "warning"}>stop_reason: {String(response?.stop_reason)}</Tag>
          <Tag>model: {response?.model}</Tag>
          <Tag>tokens: {result.metrics.input_tokens} in / {result.metrics.output_tokens} out</Tag>
          <Tag>Claude latency: {result.metrics.latency_ms} ms</Tag>
          {edited && <Tag color="gold">Đã sửa, khác bản Claude trả về</Tag>}
        </Space>
      </Flex>
    );
  }

  return (
    <Card size="small" style={{ height: "100%" }}
      title={<Space>Generated Draft <Typography.Text type="secondary">(text thật từ Claude)</Typography.Text></Space>}
      extra={
        <Space size={4}>
          <Tag color={STATUS[status].color}>{STATUS[status].label}</Tag>
          <Button size="small" icon={<UndoOutlined />} disabled={!edited} onClick={() => onDraftChange(answer)}>
            Restore
          </Button>
          <Button size="small" type="primary" icon={<CopyOutlined />} disabled={status !== "succeeded" || !draft}
            onClick={copy}>Copy</Button>
        </Space>
      }>
      {body()}
    </Card>
  );
}
