"use client";
import { Card, Empty, Tag, Timeline, Typography } from "antd";
import type { TimelineProps } from "antd";
import { MONO_FONT } from "@/theme/theme";
import type { DraftEvent } from "./api";

type TimelineItem = NonNullable<TimelineProps["items"]>[number];

const COLOR: Record<string, string> = {
  request_sent: "blue", repair_requested: "gold", response_received: "cyan",
  schema_passed: "green", schema_failed: "red",
  semantic_passed: "green", semantic_failed: "orange", error: "red",
};

const LABEL: Record<string, string> = {
  request_sent: "gọi Claude với output_format=TaskDraft",
  repair_requested: "gửi object fail + danh sách lỗi",
  response_received: "nhận object theo schema",
  schema_passed: "tầng 1 OK (Pydantic)",
  schema_failed: "tầng 1 FAIL — dừng, không chạy semantic",
  semantic_passed: "tầng 2 OK (rule nghiệp vụ)",
  semantic_failed: "tầng 2 FAIL — object bị từ chối",
};

export default function EventLog({ events, busy }: { events: DraftEvent[]; busy: boolean }) {
  const items: TimelineItem[] = events.map((event, index) => {
    const { type, ...payload } = event;
    return {
      key: index,
      color: COLOR[type] ?? "blue",
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
        Trace của đúng hành động vừa bấm. Validate không có event gọi API vì nó chạy hoàn toàn trong Python.
      </Typography.Paragraph>
      {items.length === 0
        ? <Empty description={busy ? "Đang chạy…" : "Chưa có event."} />
        : <Timeline items={items} />}
    </Card>
  );
}
