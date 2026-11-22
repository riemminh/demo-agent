"use client";

import { Card, Descriptions, Divider, Flex, Statistic, Tag, Typography } from "antd";
import type { RunRecord } from "./types";

const NA = "n/a"; // Chưa có số đo. Không dùng 0 để tránh hiểu nhầm là đo được bằng 0.

export default function MetricsSection({ run }: { run: RunRecord | null }) {
  const metrics = run?.result?.metrics;
  const response = run?.result?.response;
  const reachedBackend = run !== null && run.httpStatus !== null;

  const stats = [
    { title: "API calls (thực tế)", value: metrics ? metrics.api_calls : NA },
    { title: "Input tokens", value: metrics?.input_tokens ?? NA },
    { title: "Output tokens", value: metrics?.output_tokens ?? NA },
    { title: "Claude latency (backend)", value: metrics?.latency_ms ?? NA,
      suffix: metrics?.latency_ms != null ? "ms" : undefined },
    { title: "Round trip (browser)", value: reachedBackend ? Math.round(run.roundTripMs) : NA,
      suffix: reachedBackend ? "ms" : undefined },
  ];

  return (
    <Card title="Metrics" size="small">
      <Flex wrap gap={40}>
        {stats.map((stat) => <Statistic key={stat.title} {...stat} />)}
      </Flex>
      <Divider />
      <Descriptions
        size="small"
        column={{ xs: 1, md: 2 }}
        items={[
          { key: "model", label: "model (từ response)", children: response?.model ?? NA },
          { key: "stop", label: "stop_reason",
            children: response
              ? <Tag color={response.stop_reason === "end_turn" ? "success" : "warning"}>{String(response.stop_reason)}</Tag>
              : NA },
          { key: "request_id", label: "request_id (Anthropic)", children: run?.result?.request_id ?? NA },
          { key: "http", label: "HTTP status backend → browser", children: run?.httpStatus ?? NA },
        ]}
      />
      <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
        Token lấy từ <Typography.Text code>message.usage</Typography.Text> do API đếm. Claude latency chỉ tính
        thời gian chờ <Typography.Text code>messages.create</Typography.Text>; round trip cộng thêm FastAPI và mạng localhost.
      </Typography.Paragraph>
    </Card>
  );
}
