"use client";
import { Alert, Button, Card, Descriptions, Empty, Flex, Space, Tag, Typography } from "antd";
import CodeBlock from "@/components/CodeBlock";
import type { SdkEvent } from "./api";

type Props = {
  events: SdkEvent[];
  liveText?: string;
  running: boolean;
  pendingApproval: SdkEvent | null;
  decisionSending: boolean;
  cancelRequested: boolean;
  transportError: string;
  onDecide: (approved: boolean) => void;
};

function find(events: SdkEvent[], type: string) {
  return events.find((event) => event.type === type);
}

export default function ResultCard(props: Props) {
  const { events, running, pendingApproval } = props;
  const result = find(events, "result");
  const errorEvent = find(events, "error");
  const texts = events.filter((event) => event.type === "assistant_text");
  const retries = events.filter((event) => event.type === "system" && event.subtype === "api_retry").length;
  const decided = events.filter((event) => event.type === "permission_decided");
  const status = running ? (pendingApproval ? "waiting approval" : "running")
    : result && !result.is_error ? "succeeded"
    : errorEvent || result?.is_error ? "failed" : events.length ? "finished" : "idle";

  return (
    <Card size="small" title="Actual Result"
      extra={<Tag color={status === "succeeded" ? "success" : status === "failed" ? "error"
        : running ? "processing" : "default"}>{status}</Tag>}>
      <Flex vertical gap={12}>
        {!events.length && !running && <Empty description="Chưa chạy. Bấm Run agent để SDK xử lý query." />}
        {pendingApproval && (
          <Alert type="warning" showIcon
            title={<>SDK đang chờ <Typography.Text code>can_use_tool</Typography.Text> trả lời</>}
            description={<Flex vertical gap={8}>
              <span>
                Tool <Typography.Text strong>{pendingApproval.tool}</Typography.Text> muốn ghi dữ liệu.
                Reject thì SDK <Typography.Text strong>không chạy</Typography.Text> tool, không có row
                nào vào SQLite.
              </span>
              <CodeBlock title="Input tool" code={JSON.stringify(pendingApproval.input, null, 2)} />
              <Space>
                <Button type="primary" disabled={props.decisionSending || props.cancelRequested}
                  onClick={() => props.onDecide(true)}>Approve</Button>
                <Button danger disabled={props.decisionSending || props.cancelRequested}
                  onClick={() => props.onDecide(false)}>Reject</Button>
              </Space>
            </Flex>} />
        )}
        {retries > 0 && (running || result?.is_error) && (
          <Alert type="warning" showIcon
            title={`CLI đã retry ${retries} lần (CLAUDE_CODE_MAX_RETRIES)`}
            description={result?.is_error
              ? "Mạng đang reset kết nối tới api.anthropic.com (ECONNRESET). Retry không tự khỏi được — cần đổi mạng/VPN được phép. Demo không hiển thị output giả."
              : "Request lỗi tạm thời, CLI đang thử lại."} />
        )}
        {props.liveText && (
          <div>
            <Typography.Text strong>Đang stream (partial)</Typography.Text>
            <Typography.Paragraph style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>
              {props.liveText}
            </Typography.Paragraph>
          </div>
        )}
        {texts.length > 0 && (
          <div>
            <Typography.Text strong>Text từ agent</Typography.Text>
            {texts.map((event, index) => (
              <Typography.Paragraph key={index} style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>
                {event.text}
              </Typography.Paragraph>
            ))}
          </div>
        )}
        {result?.text && (
          <CodeBlock title={`ResultMessage (is_error=${String(result.is_error)})`} code={String(result.text)} />
        )}
        {errorEvent && (
          <Alert type={errorEvent.kind === "cancelled" ? "info" : "error"} showIcon
            title={`error(kind=${errorEvent.kind})`} description={errorEvent.message} />
        )}
        {props.transportError && (
          <Alert type="error" showIcon title="Lỗi request từ browser" description={props.transportError} />
        )}
        {decided.length > 0 && (
          <Space wrap size={4}>
            <Typography.Text strong>Quyết định permission:</Typography.Text>
            {decided.map((event, index) => (
              <Tag key={index} color={event.allowed ? "success" : "error"}>
                {event.tool} → {event.allowed ? "allow" : "deny"} ({event.reason})
              </Tag>
            ))}
          </Space>
        )}
        {result && (
          <Descriptions size="small" column={{ xs: 1, md: 4 }} bordered items={[
            { key: "turns", label: "num_turns (SDK đếm)", children: result.num_turns ?? "n/a" },
            { key: "duration", label: "duration_ms",
              children: result.duration_ms ? Math.round(result.duration_ms) : "n/a" },
            { key: "cost", label: "total_cost_usd", children: result.total_cost_usd ?? "n/a" },
            { key: "retries", label: "system(api_retry)", children: retries },
          ]} />
        )}
      </Flex>
    </Card>
  );
}
