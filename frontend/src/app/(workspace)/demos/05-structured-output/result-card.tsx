"use client";
import { Alert, Card, Descriptions, Empty, Flex, List, Space, Tag, Typography } from "antd";
import CodeBlock from "@/components/CodeBlock";
import type { DraftResult } from "./api";

type Props = { result: DraftResult | null; busy: boolean; transportError: string };

const STAGE_LABEL: Record<string, string> = {
  generate: "Generate (Claude + native schema)",
  validate: "Validate (chỉ Python)",
  repair: "Repair (Claude, một lần)",
};

export default function ResultCard({ result, busy, transportError }: Props) {
  const status = busy ? "running" : result ? (result.accepted ? "accepted" : "rejected") : "idle";
  return (
    <Card size="small" title="Actual Result"
      extra={<Space>
        {result && <Tag>{STAGE_LABEL[result.stage] ?? result.stage}</Tag>}
        <Tag color={status === "accepted" ? "success" : status === "rejected" ? "error"
          : status === "running" ? "processing" : "default"}>{status}</Tag>
      </Space>}>
      <Flex vertical gap={12}>
        {!result && !busy && <Empty description="Chưa có kết quả. Bấm Generate hoặc Validate." />}
        {transportError && <Alert type="error" showIcon title="Lỗi request từ browser" description={transportError} />}
        {result?.error && (
          <Alert type="error" showIcon title={`error(kind=${result.error.kind})`}
            description={result.error.kind === "config_missing"
              ? `${result.error.message}. Điền key vào backend/.env rồi restart backend.`
              : result.error.message} />
        )}
        {result?.stage === "repair" && result.before !== undefined && (
          <Space direction="vertical" size={4} style={{ width: "100%" }}>
            <Typography.Text strong>Trước → sau repair</Typography.Text>
            <CodeBlock title="Trước (object bị reject)" code={JSON.stringify(result.before, null, 2)} />
          </Space>
        )}
        {result?.raw !== undefined && result?.raw !== null && (
          <CodeBlock title={result.stage === "repair" ? "Sau repair" : "Object đang xét"}
            code={JSON.stringify(result.raw, null, 2)} />
        )}
        {result && (result.schema_errors.length > 0 || result.semantic_errors.length > 0) && (
          <Flex vertical gap={8}>
            {result.schema_errors.length > 0 && (
              <List size="small" bordered header={<Space><Tag color="red">Tầng 1 · schema</Tag>
                <Typography.Text type="secondary">Pydantic: kiểu, enum, field bắt buộc</Typography.Text></Space>}
                dataSource={result.schema_errors}
                renderItem={(item) => <List.Item><Typography.Text code>{item}</Typography.Text></List.Item>} />
            )}
            {result.semantic_errors.length > 0 && (
              <List size="small" bordered header={<Space><Tag color="orange">Tầng 2 · semantic</Tag>
                <Typography.Text type="secondary">Đúng kiểu nhưng sai nghiệp vụ</Typography.Text></Space>}
                dataSource={result.semantic_errors}
                renderItem={(item) => <List.Item><Typography.Text>{item}</Typography.Text></List.Item>} />
            )}
          </Flex>
        )}
        {result?.accepted && (
          <Alert type="success" showIcon title="Accepted — object qua cả hai tầng, app mới được dùng nó." />
        )}
        {result && (
          <Descriptions size="small" column={{ xs: 1, md: 4 }} bordered items={[
            { key: "calls", label: "API calls", children: result.metrics?.api_calls ?? 0 },
            { key: "latency", label: "Latency",
              children: result.metrics?.latency_ms === null || result.metrics === null
                ? "n/a (không gọi Claude)" : `${result.metrics.latency_ms} ms` },
            { key: "in", label: "input_tokens", children: result.metrics?.input_tokens ?? "n/a" },
            { key: "out", label: "output_tokens", children: result.metrics?.output_tokens ?? "n/a" },
          ]} />
        )}
      </Flex>
    </Card>
  );
}
