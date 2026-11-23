"use client";
import { Alert, Button, Card, Descriptions, Empty, Flex, Space, Tag, Typography } from "antd";
import CodeBlock from "@/components/CodeBlock";
import type { LoopEvent } from "./api";

type Props = {
  events: LoopEvent[];
  running: boolean;
  historyMessages: number;
  pendingApproval: LoopEvent | null;
  decisionSending: boolean;
  cancelRequested: boolean;
  transportError: string;
  onDecide: (approved: boolean) => void;
};

function find(events: LoopEvent[], type: string) {
  return events.find((event) => event.type === type);
}

export default function ResultCard(props: Props) {
  const { events, running, pendingApproval } = props;
  const final = find(events, "final");
  const maxTurns = find(events, "max_turns_reached");
  const errorEvent = find(events, "error");
  const started = find(events, "run_started");
  const committed = find(events, "history_committed");
  // created_ids xuất hiện ở event cuối: dù run fail, task đã INSERT vẫn còn trong DB.
  const createdIds = final?.created_ids ?? maxTurns?.created_ids ?? errorEvent?.created_ids ?? [];
  const status = running ? (pendingApproval ? "waiting approval" : "running")
    : final ? "succeeded" : maxTurns ? "max_turns_reached"
    : errorEvent ? `failed (${errorEvent.kind})` : events.length ? "finished" : "idle";

  return (
    <Card size="small" title="Actual Result"
      extra={<Tag color={final ? "success" : maxTurns || errorEvent ? "error" : running ? "processing" : "default"}>
        {status}
      </Tag>}>
      <Flex vertical gap={12}>
        {!events.length && !running && <Empty description="Chưa chạy. Bấm Run để Python bắt đầu vòng lặp." />}
        {pendingApproval && (
          <Alert type="warning" showIcon
            title={<>Loop đang <Typography.Text code>await Future</Typography.Text> — tool ghi dữ liệu cần bạn duyệt</>}
            description={<Flex vertical gap={8}>
              <span>
                Tool <Typography.Text strong>{pendingApproval.tool}</Typography.Text>. Reject thì backend
                KHÔNG INSERT gì; không trả lời trong {String(pendingApproval.timeout_seconds)}s thì tự reject.
              </span>
              <CodeBlock title="Input mà model muốn ghi" code={JSON.stringify(pendingApproval.input, null, 2)} />
              <Space>
                <Button type="primary" disabled={props.decisionSending || props.cancelRequested}
                  onClick={() => props.onDecide(true)}>Approve (ghi vào SQLite)</Button>
                <Button danger disabled={props.decisionSending || props.cancelRequested}
                  onClick={() => props.onDecide(false)}>Reject</Button>
              </Space>
            </Flex>} />
        )}
        {final?.answer && (
          <div>
            <Typography.Text strong>Final answer (stop_reason = end_turn)</Typography.Text>
            <Typography.Paragraph style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>{final.answer}</Typography.Paragraph>
          </div>
        )}
        {maxTurns && (
          <Alert type="error" showIcon title={`max_turns_reached (${maxTurns.max_turns} lượt)`}
            description={`${maxTurns.message} Đây là trạng thái THẤT BẠI rõ ràng, không phải câu trả lời.`} />
        )}
        {errorEvent && (
          <Alert type={errorEvent.kind === "cancelled" ? "info" : "error"} showIcon
            title={`error(kind=${errorEvent.kind})`}
            description={errorEvent.kind === "connection_error"
              ? `${errorEvent.message} Mạng đang chặn/reset request lớn tới api.anthropic.com — xem mục Known limitation trong README.`
              : errorEvent.message} />
        )}
        {createdIds.length > 0 && !committed && (
          <Alert type="warning" showIcon
            title="Side effect đã xảy ra nhưng hội thoại không được commit"
            description={`Task id ${createdIds.join(", ")} đã được INSERT vào SQLite trước khi run dừng. Rollback history KHÔNG rollback dữ liệu — xem bảng Tasks và tự xóa nếu cần.`} />
        )}
        {props.transportError && (
          <Alert type="error" showIcon title="Lỗi request từ browser" description={props.transportError} />
        )}
        {events.length > 0 && (
          <Descriptions size="small" column={{ xs: 1, md: 4 }} bordered items={[
            { key: "turns", label: "Turns model đã dùng",
              children: final?.turns_used ?? events.filter((event) => event.type === "request_sent").length },
            { key: "before", label: "history trước run", children: started?.history_before ?? 0 },
            { key: "after", label: "history sau run (đọc lại)", children: props.historyMessages },
            { key: "usage", label: "Tokens (tổng các lượt)",
              children: (() => {
                const usage = final?.usage ?? maxTurns?.usage
                  ?? [...events].reverse().find((event) => event.usage)?.usage;
                return usage ? `${usage.input_tokens} in / ${usage.output_tokens} out` : "n/a";
              })() },
          ]} />
        )}
      </Flex>
    </Card>
  );
}
