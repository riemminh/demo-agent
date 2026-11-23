"use client";
import { Alert, Card, Descriptions, Empty, Flex, Tag, Typography } from "antd";
import type { WorkflowResult } from "./api";

type Props = { result: WorkflowResult | null; running: boolean; transportError: string };

export default function ResultCard({ result, running, transportError }: Props) {
  const status = running ? "running" : result?.status ?? "idle";
  const llmCalls = result?.steps.filter((step) => step.kind === "llm") ?? [];
  // Tổng thời gian từng call (nếu chạy tuần tự) để so với latency thật.
  const serialMs = llmCalls.reduce((total, step) => total + (step.end_ms - step.start_ms), 0);
  return (
    <Card size="small" title="Actual Result"
      extra={<Tag color={status === "succeeded" ? "success" : status === "failed" ? "error"
        : status === "running" ? "processing" : "default"}>{status}</Tag>}>
      <Flex vertical gap={12}>
        {!result && !running && <Empty description="Chưa chạy. Chọn pattern rồi bấm Run workflow." />}
        {transportError && <Alert type="error" showIcon title="Lỗi request từ browser" description={transportError} />}
        {result?.error && (
          <Alert type="error" showIcon title={`error(kind=${result.error.kind})`}
            description={result.error.kind === "budget_exceeded"
              ? `${result.error.message} Trace phía dưới cho thấy nó dừng ở bước nào.`
              : result.error.kind === "config_missing"
                ? `${result.error.message}. Điền key vào backend/.env rồi restart backend.`
                : result.error.message} />
        )}
        {result?.answer && (
          <div>
            <Typography.Text strong>Kết quả cuối của workflow</Typography.Text>
            <Typography.Paragraph style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>
              {result.answer}
            </Typography.Paragraph>
          </div>
        )}
        {result?.metrics && (
          <Descriptions size="small" column={{ xs: 1, md: 5 }} bordered items={[
            { key: "calls", label: "API calls / budget",
              children: `${result.metrics.api_calls} / ${result.metrics.budget}` },
            { key: "latency", label: "Latency thật", children: `${Math.round(result.metrics.latency_ms)} ms` },
            { key: "serial", label: "Tổng thời gian các call",
              children: llmCalls.length ? `${Math.round(serialMs)} ms` : "n/a" },
            { key: "in", label: "input_tokens", children: result.metrics.input_tokens },
            { key: "out", label: "output_tokens", children: result.metrics.output_tokens },
          ]} />
        )}
        {result?.scenario === "parallel" && llmCalls.length === 2 && (
          <Alert type="info" showIcon
            title={`Latency ${Math.round(result.metrics?.latency_ms ?? 0)} ms trong khi tổng thời gian hai call là ${Math.round(serialMs)} ms`}
            description="Chênh lệch này chính là phần tiết kiệm được nhờ asyncio.gather() — hai call chồng nhau, không cộng dồn." />
        )}
      </Flex>
    </Card>
  );
}
