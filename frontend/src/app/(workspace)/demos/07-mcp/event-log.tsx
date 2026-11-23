"use client";
import { Card, Empty, Tag, Timeline, Typography } from "antd";
import type { TimelineProps } from "antd";
import { MONO_FONT } from "@/theme/theme";
import type { McpEvent } from "./api";

type TimelineItem = NonNullable<TimelineProps["items"]>[number];

const COLOR: Record<string, string> = {
  spawn: "orange", initialize: "blue", "tools/list": "cyan", "tools/call": "purple",
  result: "green", rejected: "red", "resources/list": "cyan", "resources/read": "green",
  "prompts/list": "cyan", "prompts/get": "green",
};

const LABEL: Record<string, string> = {
  spawn: "bridge spawn server (stdio subprocess)",
  initialize: "handshake MCP: protocol version + capabilities",
  "tools/list": "client hỏi server có tool gì",
  "tools/call": "client gọi tool theo tên server công bố",
  result: "server trả CallToolResult",
  rejected: "client từ chối: server không công bố tool này",
  "resources/list": "liệt kê resource",
  "resources/read": "đọc nội dung resource",
  "prompts/list": "liệt kê prompt template",
  "prompts/get": "lấy message từ template",
};

export default function EventLog({ events, running }: { events: McpEvent[]; running: boolean }) {
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
        Từng bước protocol do MCP client ghi lại, thời gian đo ở backend. Không có bước nào được
        dựng thêm ở UI.
      </Typography.Paragraph>
      {items.length === 0
        ? <Empty description={running ? "Đang mở session…" : "Chưa có event."} />
        : <Timeline mode="start" titleSpan={3} items={items} />}
    </Card>
  );
}
