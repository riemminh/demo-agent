"use client";
import { Alert, Card, Descriptions, Empty, Flex, Space, Tag, Typography } from "antd";
import CodeBlock from "@/components/CodeBlock";
import type { ToolRunResult } from "./api";

type Props = { result: ToolRunResult | null; running: boolean; transportError: string };

export default function ResultCard({ result, running, transportError }: Props) {
  const noToolUse = result?.events.some((event) => event.type === "no_tool_use");
  const status = running ? "running" : result?.status ?? "idle";
  return (
    <Card size="small" title="Actual Result"
      extra={<Tag color={status === "succeeded" ? "success" : status === "failed" ? "error"
        : status === "running" ? "processing" : "default"}>{status}</Tag>}>
      <Flex vertical gap={12}>
        {!result && !running && <Empty description="Chưa chạy. Bấm Run để Claude quyết định có gọi tool không." />}
        {transportError && <Alert type="error" showIcon title="Lỗi request từ browser" description={transportError} />}
        {result?.error && (
          <Alert type="error" showIcon title={`error(kind=${result.error.kind})`}
            description={result.error.kind === "config_missing"
              ? `${result.error.message}. Điền key vào backend/.env rồi restart backend.`
              : result.error.message} />
        )}
        {noToolUse && (
          <Alert type="warning" showIcon
            title="Lần này Claude KHÔNG gọi tool nào — nó trả text luôn."
            description="Đây là quyết định thật của model với tool_choice=auto. Demo hiển thị đúng thực tế thay vì dựng một tool_use giả." />
        )}
        {result?.tool_calls.map((call) => (
          <Space key={call.id} direction="vertical" size={4} style={{ width: "100%" }}>
            <Space wrap size={4}>
              <Tag color="purple">tool_use</Tag>
              <Typography.Text strong>{call.name}</Typography.Text>
              <Typography.Text code>{call.id}</Typography.Text>
              {call.result.is_error
                ? <Tag color="error">is_error = true</Tag>
                : <Tag color="success">is_error = false</Tag>}
            </Space>
            <CodeBlock title="Input do Claude sinh ra (model chọn tên tool + input)"
              code={JSON.stringify(call.input, null, 2)} />
            <Typography.Paragraph style={{ margin: 0 }}>
              <Typography.Text strong>Python trả về: </Typography.Text>
              <Typography.Text type={call.result.is_error ? "danger" : undefined} code>
                {call.result.content}
              </Typography.Text>
            </Typography.Paragraph>
          </Space>
        ))}
        {result?.answer && (
          <div>
            <Typography.Text strong>Câu trả lời cuối (sau khi Claude nhận tool_result)</Typography.Text>
            <Typography.Paragraph style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>
              {result.answer}
            </Typography.Paragraph>
          </div>
        )}
        {result && (
          <Descriptions size="small" column={{ xs: 1, md: 4 }} bordered items={[
            { key: "calls", label: "API calls", children: result.metrics.api_calls },
            { key: "latency", label: "Latency", children: result.metrics.latency_ms === null ? "n/a" : `${result.metrics.latency_ms} ms` },
            { key: "in", label: "input_tokens (2 call)", children: result.metrics.input_tokens },
            { key: "out", label: "output_tokens (2 call)", children: result.metrics.output_tokens },
          ]} />
        )}
      </Flex>
    </Card>
  );
}
