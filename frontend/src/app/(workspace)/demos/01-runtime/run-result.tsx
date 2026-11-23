"use client";
import { Alert, Button, Card, Descriptions, Empty, Flex, Progress, Space, Tag, Typography } from "antd";
import CodeBlock from "@/components/CodeBlock";
import type { AgentEvent } from "./api";
import type { ReceivedEvent } from "./event-log";

type Props = {
  running: boolean;
  events: ReceivedEvent[];
  pendingApproval: AgentEvent | null;
  decisionSending: boolean;
  cancelRequested: boolean;
  liveText: string;
  answer: string;
  error: string;
  progress: number;
  onDecide: (approved: boolean) => void;
};

const STATUS = {
  idle: { color: "default", label: "idle" },
  running: { color: "processing", label: "running" },
  waiting: { color: "warning", label: "waiting approval (await Future)" },
  cancelling: { color: "warning", label: "cancel requested" },
  finished: { color: "success", label: "finished (final)" },
  cancelled: { color: "default", label: "cancelled" },
  failed: { color: "error", label: "failed" },
} as const;

// Trạng thái suy ra hoàn toàn từ event backend đã gửi, không đoán ở frontend.
function runStatus(props: Props): keyof typeof STATUS {
  if (props.running) {
    if (props.pendingApproval) return "waiting";
    return props.cancelRequested ? "cancelling" : "running";
  }
  if (props.events.length === 0 && !props.error) return "idle";
  const errorEvent = props.events.find(({ event }) => event.type === "error")?.event;
  if (errorEvent?.kind === "cancelled") return "cancelled";
  if (errorEvent || props.error) return "failed";
  return "finished";
}

export default function RunResult(props: Props) {
  const { pendingApproval, events, error, progress } = props;
  const status = runStatus(props);
  const errorEvent = events.find(({ event }) => event.type === "error")?.event;
  const toolResult = events.find(({ event }) => event.type === "tool_result")?.event;
  const total = Number(events.find(({ event }) => event.type === "progress")?.event.total ?? 20);
  return (
    <Card size="small" title="Actual Result" extra={<Tag color={STATUS[status].color}>{STATUS[status].label}</Tag>}>
      <Flex vertical gap={12}>
        {/* Chỉ hiện khi backend thật sự gửi approval_required. */}
        {pendingApproval && (
          <Alert type="warning" showIcon
            title={<>Agent đang <Typography.Text code>await Future</Typography.Text> — cần quyết định</>}
            description={<Flex vertical gap={8}>
              <span>
                Tool <Typography.Text strong>{pendingApproval.tool}</Typography.Text> · approval_id{" "}
                <Typography.Text code>{pendingApproval.approval_id}</Typography.Text>. Bấm một nút để gọi{" "}
                <Typography.Text code>POST /approvals/&#123;id&#125;</Typography.Text> →{" "}
                <Typography.Text code>future.set_result(...)</Typography.Text>. Không bấm thì broker tự reject sau{" "}
                {String(pendingApproval.timeout_seconds)} giây.
              </span>
              <CodeBlock title="Tool input chờ phê duyệt" code={JSON.stringify(pendingApproval.input, null, 2)} />
              <Space>
                <Button type="primary" disabled={props.decisionSending || props.cancelRequested}
                  onClick={() => props.onDecide(true)}>Approve (True)</Button>
                <Button danger disabled={props.decisionSending || props.cancelRequested}
                  onClick={() => props.onDecide(false)}>Reject (False)</Button>
              </Space>
            </Flex>} />
        )}
        {status === "idle" && <Empty description="Chưa chạy. Bấm Start để backend tạo Task và stream event thật." />}
        {status !== "idle" && (
          <Descriptions size="small" column={1} bordered items={[
            ...(progress > 0 ? [{
              key: "progress", label: "Progress (event progress)",
              children: <Progress percent={Math.round((progress / total) * 100)} format={() => `${progress}/${total}`} />,
            }] : []),
            ...(toolResult ? [{
              key: "tool", label: `Tool result (${String(toolResult.tool)})`,
              children: <Typography.Text type={toolResult.is_error ? "danger" : undefined}>
                {String(toolResult.result ?? "")}
              </Typography.Text>,
            }] : []),
            { key: "live", label: "Live text (text_delta)", children: props.liveText || "(chưa có text_delta)" },
            { key: "final", label: "Final answer (event final)",
              children: props.answer ? <Typography.Text strong>{props.answer}</Typography.Text> : "(chưa có final)" },
          ]} />
        )}
        {errorEvent && (
          <Alert type={errorEvent.kind === "cancelled" ? "info" : "error"} showIcon
            title={`error(kind=${String(errorEvent.kind)})`} description={String(errorEvent.message ?? "")} />
        )}
        {error && <Alert type="error" showIcon title="Lỗi request từ browser" description={error} />}
      </Flex>
    </Card>
  );
}
