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
  rules_loaded: "geekblue", system_prompt_sent: "geekblue",
  skills_discovered: "purple", skill_loaded: "purple", skill_already_loaded: "purple",
  skill_merged_into_system: "purple", skill_tool_removed: "purple", skill_tools_cleared: "purple",
  permission_requested: "gold", permission_decided: "gold",
  subagents_registered: "cyan", delegation_started: "cyan", delegation_finished: "cyan",
  requirements_merged_into_system: "geekblue", subagent_read_removed: "geekblue",
  subagent_delegate_narrowed: "geekblue", subagent_result_merged: "geekblue",
  subagent_tools_cleared: "geekblue",
  subagent_started: "cyan", subagent_finished: "cyan",
};

const LABEL: Record<string, string> = {
  request_sent: "messages.create() cho lượt này",
  response_received: "model trả stop_reason",
  tool_use: "model xin gọi tool",
  tool_result: "Python trả kết quả tool",
  approval_required: "chờ người duyệt (await Future)",
  history_committed: "commit working_messages vào session.history",
  max_turns_reached: "hết lượt, không có final",
  rules_loaded: "đọc CLAUDE.md + rules từ filesystem",
  system_prompt_sent: "system prompt gửi kèm request",
  skills_discovered: "metadata skill (chưa nạp body)",
  skill_loaded: "load_skill trả SKILL.md",
  skill_already_loaded: "Python chặn nạp skill trùng",
  skill_merged_into_system: "ghép SKILL vào system (sau compact vẫn còn)",
  skill_tool_removed: "gỡ load_skill khỏi tools",
  skill_tools_cleared: "gỡ hết tool — chỉ end_turn",
  permission_requested: "kiểm tra quyền trước execute",
  permission_decided: "allow/deny từ permissions.py",
  subagents_registered: "khai báo subagent có sẵn",
  delegation_started: "main gọi delegate_task",
  subagent_started: "vòng lặp con (context tách)",
  delegation_finished: "kết quả rút gọn về main",
  requirements_merged_into_system: "ghép requirements.md vào system",
  subagent_read_removed: "gỡ read_file sau khi đọc",
  subagent_delegate_narrowed: "delegate chỉ còn subagent chưa chạy",
  subagent_result_merged: "tóm tắt subagent vào system",
  subagent_tools_cleared: "gỡ hết tool — chỉ end_turn",
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
