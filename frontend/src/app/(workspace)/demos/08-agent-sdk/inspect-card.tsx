"use client";
import { Card, Descriptions, Empty, Space, Tag, Typography } from "antd";
import type { Inspection } from "./api";

// Bằng chứng options của app đã tới CLI thật — lấy từ get_server_info(), không gọi model.
export default function InspectCard({ inspection }: { inspection: Inspection | null }) {
  return (
    <Card size="small" title="SDK session (initialize thật, không gọi model)">
      {!inspection
        ? <Empty description="Bấm Inspect để spawn CLI, initialize và đọc metadata session." />
        : <Space direction="vertical" size={8} style={{ width: "100%" }}>
            <Descriptions size="small" column={{ xs: 1, md: 3 }} bordered items={[
              { key: "transport", label: "transport", children: inspection.transport ?? "claude_code_cli" },
              { key: "cli", label: "Claude Code CLI", children: inspection.cli_version ?? "n/a" },
              { key: "pid", label: "pid của CLI", children: inspection.pid ?? "n/a" },
              { key: "connect", label: "Thời gian initialize",
                children: `${Math.round(inspection.connect_ms)} ms` },
              { key: "mode", label: "permission_mode", children: inspection.permission_mode ?? "n/a" },
              { key: "skills", label: "skills",
                children: inspection.skills?.length
                  ? inspection.skills.map((skill) => <Tag key={skill} color="blue">{skill}</Tag>)
                  : "không bật" },
              { key: "cwd", label: "cwd (sandbox)",
                children: <Typography.Text code>{inspection.cwd.split("/").slice(-3).join("/")}</Typography.Text> },
            ]} />
            <Space wrap size={4}>
              <Typography.Text strong>allowed_tools:</Typography.Text>
              {inspection.allowed_tools.map((tool) => <Tag key={tool}>{tool}</Tag>)}
            </Space>
            <Space wrap size={4}>
              <Typography.Text strong>subagents app khai báo:</Typography.Text>
              {inspection.subagents_declared.length
                ? inspection.subagents_declared.map((name) => (
                    <Tag key={name} color={inspection.subagents_registered.includes(name) ? "success" : "warning"}>
                      {name} {inspection.subagents_registered.includes(name) ? "· CLI đã đăng ký" : "· chưa thấy"}
                    </Tag>
                  ))
                : <Typography.Text type="secondary">không có (scenario này không dùng subagent)</Typography.Text>}
            </Space>
          </Space>}
    </Card>
  );
}
