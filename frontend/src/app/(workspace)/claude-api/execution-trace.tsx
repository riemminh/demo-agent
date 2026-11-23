"use client";

import { Card, Empty, Spin, Timeline, Typography } from "antd";
import type { TimelineProps } from "antd";
import type { RunRecord } from "./types";

const { Text } = Typography;
type TimelineItem = NonNullable<TimelineProps["items"]>[number];

function clock(date: Date) {
  return `${date.toLocaleTimeString("vi-VN", { hour12: false })}.${String(date.getMilliseconds()).padStart(3, "0")}`;
}

// Trace dựng hoàn toàn từ dữ liệu runtime của lần Run này: thời điểm browser gửi,
// HTTP status, latency backend đo, request_id/usage Claude trả. Không có bước nào bịa thêm.
function TraceTimeline({ run }: { run: RunRecord }) {
  const { result } = run;
  const items: TimelineItem[] = [
    { color: "blue", title: clock(run.sentAt),
      content: <>Browser gửi <Text code>POST /api/claude-api/one-shot</Text></> },
  ];

  if (run.httpStatus === null) {
    items.push({ color: "red", content: `fetch thất bại, không nhận được HTTP response: ${run.clientError}` });
  } else if (!result) {
    items.push({ color: "red", content: `FastAPI từ chối request (HTTP ${run.httpStatus}) trước khi gọi Claude: ${run.clientError}` });
  } else {
    items.push({ color: "blue", content: <>FastAPI validate body bằng Pydantic → <Text code>run_messages_api()</Text></> });
    const latency = `${result.metrics.latency_ms} ms`;
    if (result.metrics.api_calls === 0) {
      items.push({ color: "gray", content: `Không gọi Claude (api_calls = 0): ${result.error?.message}` });
    } else if (result.status === "succeeded" && result.response) {
      items.push({ color: "green", title: latency,
        content: <><Text code>client.messages.create()</Text> → Claude trả Message <Text code>{result.response.id}</Text> · request_id <Text code>{result.request_id ?? "n/a"}</Text></> });
      items.push({ color: "green",
        content: <>stop_reason = <Text code>{String(result.response.stop_reason)}</Text> · usage: {result.response.usage.input_tokens} input / {result.response.usage.output_tokens} output tokens</> });
    } else {
      const upstream = result.error?.upstream_status ? ` (Anthropic HTTP ${result.error.upstream_status})` : "";
      items.push({ color: "red", title: latency,
        content: <><Text code>client.messages.create()</Text> lỗi <Text code>{result.error?.kind}</Text>{upstream}: {result.error?.message}</> });
    }
  }

  if (run.httpStatus !== null) {
    items.push({ color: "gray", title: `+${Math.round(run.roundTripMs)} ms`,
      content: `Browser nhận HTTP ${run.httpStatus} và render UI (round trip đo bằng performance.now())` });
  }

  return (
    <>
      <Typography.Paragraph type="secondary">
        One-shot chỉ có một lần gọi Claude nên trace ngắn. Cột trái: thời điểm gửi, latency của
        lần gọi Claude (đo ở backend) và round trip (đo ở browser).
      </Typography.Paragraph>
      <Timeline mode="start" titleSpan={4} items={items} />
    </>
  );
}

// Khối "Execution Events": chưa Run thì không có bước nào, không hiện trace giả.
export default function ExecutionTrace({ run, running }: { run: RunRecord | null; running: boolean }) {
  return (
    <Card title="Execution Events" size="small">
      {running
        ? <Spin description="Đang chờ Claude trả lời…"><div style={{ height: 120 }} /></Spin>
        : run ? <TraceTimeline run={run} /> : <Empty description="Chưa chạy demo. Bấm Run để gửi request thật." />}
    </Card>
  );
}
