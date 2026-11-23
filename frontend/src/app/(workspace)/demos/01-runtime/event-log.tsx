"use client";
import { Card, Empty, Tag, Timeline, Typography } from "antd";
import type { TimelineProps } from "antd";
import { MONO_FONT } from "@/theme/theme";
import type { AgentEvent } from "./api";

// atMs: thời điểm browser nhận event, tính từ lúc bấm Start (performance.now()).
export type ReceivedEvent = { atMs: number; event: AgentEvent };

type TimelineItem = NonNullable<TimelineProps["items"]>[number];

const COLOR: Record<string, string> = {
  run_started: "blue", approval_required: "orange", approval_decision: "orange",
  approval_timeout: "red", error: "red", final: "green", run_finished: "gray",
};

// Mỗi dòng là một event SSE thật, đúng thứ tự nhận được. Chưa Run thì không có dòng nào.
export default function EventLog({ events, running, expectedFlow }: {
  events: ReceivedEvent[];
  running: boolean;
  expectedFlow: string;
}) {
  const items: TimelineItem[] = events.map(({ atMs, event }) => {
    const { type, ...payload } = event;
    return {
      color: COLOR[type] ?? "blue",
      title: `+${Math.round(atMs)} ms`,
      content: <>
        <Tag>{type}</Tag>
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
        Thứ tự backend phát theo <Typography.Text code>runtime.py</Typography.Text>:{" "}
        <Typography.Text code>{expectedFlow}</Typography.Text>. Cột trái là lúc browser nhận từng khung SSE.
      </Typography.Paragraph>
      {items.length === 0
        ? <Empty description={running ? "Đang chờ event đầu tiên…" : "Chưa có event."} />
        : <div style={{ maxHeight: 420, overflow: "auto", paddingTop: 8 }}>
            <Timeline mode="start" titleSpan={3} items={items} />
          </div>}
    </Card>
  );
}
