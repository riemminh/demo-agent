"use client";
import { Card, Empty, Tag, Timeline, Typography } from "antd";
import type { TimelineProps } from "antd";
import { MONO_FONT } from "@/theme/theme";
import type { DemoEvent } from "./use-claude";

type TimelineItem = NonNullable<TimelineProps["items"]>[number];

const COLOR: Record<string, string> = {
  request_sent: "blue", response_received: "green", final: "green",
  response_failed: "red", error: "red", run_finished: "gray",
};

// Chỉ các mốc THẬT: lúc browser gửi request, lúc nhận response, từng text_delta của SSE.
// Không dựng bước trung gian nào (demo này không có tool call).
export default function EventLog({ events, running }: { events: DemoEvent[]; running: boolean }) {
  const items: TimelineItem[] = events.map((event, index) => ({
    key: index,
    color: COLOR[event.type] ?? "blue",
    title: `+${Math.round(event.atMs)} ms`,
    content: <>
      <Tag>{event.type}</Tag>
      {event.detail && (
        <Typography.Text style={{ fontFamily: MONO_FONT, fontSize: 13, overflowWrap: "anywhere" }}>
          {event.detail}
        </Typography.Text>
      )}
    </>,
  }));
  return (
    <Card size="small" title={`Execution Events (${events.length})`}>
      <Typography.Paragraph type="secondary">
        Mốc thời gian do browser đo từ lúc bấm Send. Scenario Streaming có một dòng cho mỗi khung{" "}
        <Typography.Text code>text_delta</Typography.Text> nhận được qua SSE.
      </Typography.Paragraph>
      {items.length === 0
        ? <Empty description={running ? "Đang chờ event đầu tiên…" : "Chưa có event."} />
        : <div style={{ maxHeight: 420, overflow: "auto", paddingTop: 8 }}>
            <Timeline mode="start" titleSpan={3} items={items} />
          </div>}
    </Card>
  );
}
