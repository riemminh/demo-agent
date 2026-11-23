"use client";
import { Card, Empty, Tag, Timeline, Typography } from "antd";
import type { TimelineProps } from "antd";
import { MONO_FONT } from "@/theme/theme";
import type { LoopEvent } from "./api";

type TimelineItem = NonNullable<TimelineProps["items"]>[number];

const COLOR: Record<string, string> = {
  run_started: "blue", request_sent: "blue", response_received: "cyan",
  tool_use: "purple", tool_result: "orange", approval_required: "gold",
  approval_decision: "gold", history_committed: "green", final: "green",
  max_turns_reached: "red", error: "red", run_finished: "gray",
};

const LABEL: Record<string, string> = {
  request_sent: "messages.create() cho lượt này",
  response_received: "model trả stop_reason",
  tool_use: "model xin gọi tool",
  tool_result: "Python trả kết quả tool",
  approval_required: "chờ người duyệt (await Future)",
  history_committed: "commit working_messages vào session.history",
  max_turns_reached: "hết lượt, không có final",
};

export default function EventLog({ events, running }: { events: LoopEvent[]; running: boolean }) {
  const items: TimelineItem[] = events.map((event, index) => {
    const { type, at_ms: atMs, ...payload } = event;
    return {
      key: index,
      color: COLOR[type] ?? "blue",
      title: atMs === undefined ? "—" : `+${Math.round(atMs)} ms`,
      content: <>
        <Tag>{type}</Tag>
        <Typography.Text type="secondary">{LABEL[type] ?? ""} </Typography.Text>
        {Object.keys(payload).length > 0 && (
          <Typography.Text style={{ fontFamily: MONO_FONT, fontSize: 13, overflowWrap: "anywhere" }}>
            {JSON.stringify(payload).slice(0, 400)}
          </Typography.Text>
        )}
      </>,
    };
  });
  return (
    <Card size="small" title={`Execution Events (${events.length})`}>
      <Typography.Paragraph type="secondary">
        Event do backend ghi trong lúc loop chạy. Để ý <Typography.Text code>messages_in_request</Typography.Text> tăng
        dần qua từng lượt và <Typography.Text code>stop_reason</Typography.Text> quyết định loop tiếp hay dừng.
      </Typography.Paragraph>
      {items.length === 0
        ? <Empty description={running ? "Đang chạy…" : "Chưa có event."} />
        : <div style={{ maxHeight: 460, overflow: "auto", paddingTop: 8 }}>
            <Timeline mode="start" titleSpan={3} items={items} />
          </div>}
    </Card>
  );
}
