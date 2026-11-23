"use client";
import { Card, Empty, Tag, Timeline, Typography } from "antd";
import type { TimelineProps } from "antd";
import { MONO_FONT } from "@/theme/theme";
import type { SdkEvent } from "./api";

type TimelineItem = NonNullable<TimelineProps["items"]>[number];

const COLOR: Record<string, string> = {
  options_built: "orange", sdk_connected: "blue", hook_fired: "gold",
  permission_requested: "purple", permission_decided: "purple",
  approval_required: "gold", approval_decision: "gold",
  tool_use: "purple", tool_result: "cyan", assistant_text: "green",
  system: "default", result: "green", error: "red", run_finished: "gray",
};

const LABEL: Record<string, string> = {
  options_built: "app dựng ClaudeAgentOptions",
  sdk_connected: "SDK spawn CLI + initialize",
  hook_fired: "SDK gọi hook của app",
  permission_requested: "SDK hỏi can_use_tool",
  permission_decided: "app trả lời allow/deny",
  approval_required: "chờ người dùng (await Future)",
  tool_use: "agent gọi tool",
  tool_result: "kết quả tool trả về agent",
  assistant_text: "text của agent",
  system: "SystemMessage của SDK",
  result: "ResultMessage: kết thúc run",
};

export default function EventLog({ events, running }: { events: SdkEvent[]; running: boolean }) {
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
            {JSON.stringify(payload).slice(0, 320)}
          </Typography.Text>
        )}
      </>,
    };
  });
  return (
    <Card size="small" title={`Execution Events (${events.length})`}>
      <Typography.Paragraph type="secondary">
        Mọi dòng đều là message/callback thật của SDK (kể cả <Typography.Text code>system(api_retry)</Typography.Text>{" "}
        khi mạng lỗi). Không có bước nào do UI dựng thêm.
      </Typography.Paragraph>
      {items.length === 0
        ? <Empty description={running ? "Đang chạy…" : "Chưa có event."} />
        : <div style={{ maxHeight: 460, overflow: "auto", paddingTop: 8 }}>
            <Timeline mode="start" titleSpan={3} items={items} />
          </div>}
    </Card>
  );
}
