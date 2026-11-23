"use client";
import { Card, Empty, Tag, Timeline, Typography } from "antd";
import type { TimelineProps } from "antd";
import { MONO_FONT } from "@/theme/theme";
import type { ToolEvent } from "./api";

type TimelineItem = NonNullable<TimelineProps["items"]>[number];

const COLOR: Record<string, string> = {
  request_sent: "blue", response_received: "cyan", tool_use: "purple",
  registry_lookup: "orange", tool_executed: "orange", tool_result_sent: "purple",
  final: "green", no_tool_use: "red",
};

const LABEL: Record<string, string> = {
  request_sent: "messages.create() — gửi request",
  response_received: "response nhận được",
  tool_use: "Claude xin gọi tool",
  registry_lookup: "tra TOOL_REGISTRY theo tên",
  tool_executed: "Python chạy hàm thật",
  tool_result_sent: "đính tool_result vào messages",
  final: "câu trả lời cuối",
  no_tool_use: "model không gọi tool",
};

// Event do BACKEND ghi trong lúc thực thi (at_ms đo ở Python), không phải dựng ở UI.
export default function EventLog({ events, running }: { events: ToolEvent[]; running: boolean }) {
  const items: TimelineItem[] = events.map((event, index) => {
    const { type, at_ms: atMs, ...payload } = event;
    return {
      key: index,
      color: COLOR[type] ?? "blue",
      title: `+${Math.round(atMs)} ms`,
      content: <>
        <Tag>{type}</Tag>
        <Typography.Text type="secondary">{LABEL[type] ?? ""} </Typography.Text>
        {Object.keys(payload).length > 0 && (
          <Typography.Text style={{ fontFamily: MONO_FONT, fontSize: 13, overflowWrap: "anywhere" }}>
            {JSON.stringify(payload)}
          </Typography.Text>
        )}
      </>,
    };
  });
  return (
    <Card size="small" title={`Execution Events (${events.length})`}>
      <Typography.Paragraph type="secondary">
        Mốc thời gian đo ở backend, tính từ lúc nhận request. Thứ tự thật của một tool round:{" "}
        <Typography.Text code>request #1 → tool_use → registry → tool_result → request #2 → final</Typography.Text>.
      </Typography.Paragraph>
      {items.length === 0
        ? <Empty description={running ? "Đang chạy…" : "Chưa có event."} />
        : <div style={{ maxHeight: 460, overflow: "auto", paddingTop: 8 }}>
            <Timeline mode="start" titleSpan={3} items={items} />
          </div>}
    </Card>
  );
}
