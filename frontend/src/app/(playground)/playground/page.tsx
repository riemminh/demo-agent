"use client";

import { ArrowRightOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Col, Descriptions, Flex, Row, Tag, Typography } from "antd";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getHealth, type Health } from "@/lib/api";
import { ENGINEERING_OUTCOME, MODULES, STATUS_TAG, type Lesson } from "@/lib/lessons";

const { Text, Paragraph } = Typography;

// Chỉ liệt kê route ĐANG chạy được. Feature chưa implement nằm ở danh sách module bên dưới.
const RUNNABLE_DEMOS = [
  {
    route: "/lessons/messages-api", ids: "06", title: "Generate Task Description",
    runtime: <Tag color="purple">Claude API thật</Tag>,
    input: "Task title + requirements (hoặc preset Leave Email) → Generate Description",
    output: "Draft text Claude trả về, Copy/Edit được; metrics, Request/Response JSON, source Python.",
  },
  {
    route: "/approval", ids: "04 · 05", title: "Agent Approval + Cancel",
    runtime: <Tag>Offline · legacy</Tag>,
    input: "Start Approval → Approve / Reject; Start Long Running → Cancel",
    output: "Approval card từ SSE event, event log, history chỉ commit khi run xong.",
    note: "Tool create_ticket_draft hiện vẫn mô phỏng; Pass B đổi sang ghi file sandbox thật.",
  },
  {
    route: "/", ids: "01", title: "SSE Streaming",
    runtime: <Tag>Offline · legacy</Tag>,
    input: "Nhập câu hỏi → Send",
    output: "Event stream tăng dần qua Queue → StreamingResponse → browser.",
  },
];

function LessonTag({ lesson }: { lesson: Lesson }) {
  const text = `${lesson.id} · ${lesson.title}`;
  if (!lesson.route) return <Tag title={STATUS_TAG.coming_soon.label}>{text}</Tag>;
  return <Link href={lesson.route}><Tag color={STATUS_TAG[lesson.status].color}>{text}</Tag></Link>;
}

export default function WorkspaceHome() {
  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  // Chỉ GET /api/health: không gọi Claude khi mở trang.
  useEffect(() => {
    getHealth().then(setHealth).catch((e: Error) => setHealthError(e.message));
  }, []);

  return (
    <Flex vertical gap={16}>
      <div>
        <Text type="secondary">Workspace Home</Text>
        <Typography.Title level={2} style={{ margin: "4px 0 8px" }}>AI Task Manager Workspace</Typography.Title>
        <Paragraph style={{ marginBottom: 0 }}>
          Mỗi mục là một tính năng chạy thật: nhập dữ liệu, bấm Run, xem output và state, rồi mở trace/source
          để hiểu cơ chế Agent phía sau.
        </Paragraph>
      </div>

      <Card size="small" title="Trạng thái backend">
        {healthError
          ? <Alert type="error" showIcon title="Backend offline" description={`${healthError}. Chạy backend ở port 9000 (xem README).`} />
          : <Descriptions size="small" column={{ xs: 1, md: 3 }} items={[
              { key: "backend", label: "Backend", children: health ? <Tag color="success">online</Tag> : "đang kiểm tra…" },
              { key: "llm", label: "Claude API", children: !health ? "—" : health.llm_configured
                ? <Tag color="blue">đã cấu hình</Tag>
                : <Tag color="warning">thiếu {health.missing_env.join(", ")}: Live verification pending</Tag> },
              { key: "model", label: "Model (LLM_MODEL)", children: health?.model ?? "—" },
            ]} />}
      </Card>

      <Typography.Title level={4} style={{ margin: 0 }}>Chạy được ngay</Typography.Title>
      <Row gutter={[16, 16]}>
        {RUNNABLE_DEMOS.map((demo) => (
          <Col key={demo.route} xs={24} md={12} xl={8}>
            <Card size="small" style={{ height: "100%" }}
              title={<>{demo.ids} · {demo.title}</>} extra={demo.runtime}
              actions={[<Button key="open" type="primary" href={demo.route} icon={<ArrowRightOutlined />}
                iconPlacement="end">Mở demo</Button>]}>
              <Paragraph style={{ marginBottom: 6 }}><Text strong>Bạn làm: </Text>{demo.input}</Paragraph>
              <Paragraph style={{ marginBottom: demo.note ? 6 : 0 }}><Text strong>Bạn thấy: </Text>{demo.output}</Paragraph>
              {demo.note && <Text type="warning">{demo.note}</Text>}
            </Card>
          </Col>
        ))}
      </Row>

      <Typography.Title level={4} style={{ margin: 0 }}>Các module</Typography.Title>
      <Text type="secondary">
        Tag màu là feature chạy được (bấm để mở). Tag xám là Coming Soon: chưa implement, chưa có trang.
      </Text>
      <Row gutter={[16, 16]}>
        {MODULES.map((module, index) => (
          <Col key={module.id} xs={24} xl={12}>
            <Card size="small" style={{ height: "100%" }} title={`0${index + 1} · ${module.title}`}>
              <Flex wrap gap={6} style={{ marginBottom: 10 }}>
                {module.lessons.map((lesson) => <LessonTag key={lesson.id} lesson={lesson} />)}
              </Flex>
              <Paragraph type="secondary" style={{ margin: 0 }}>
                <Text strong>Kết quả cần đạt: </Text>{module.outcome}
              </Paragraph>
            </Card>
          </Col>
        ))}
        <Col xs={24} xl={12}>
          <Card size="small" style={{ height: "100%" }} title="09 · Engineering (xuyên suốt)">
            <Paragraph type="secondary" style={{ margin: 0 }}>
              Không có trang riêng: giải thích qua code của từng feature. <Text strong>Kết quả cần đạt: </Text>{ENGINEERING_OUTCOME}
            </Paragraph>
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card size="small" style={{ height: "100%" }} title="★ Final · AI Task Manager Workspace"
            extra={<Tag>{STATUS_TAG.coming_soon.label}</Tag>}>
            <Paragraph type="secondary" style={{ margin: 0 }}>
              Agent SDK chat + Task Board SQLite + File Explorer + Approval + Cancel. Chưa implement, route /workspace chưa tồn tại.
            </Paragraph>
          </Card>
        </Col>
      </Row>
    </Flex>
  );
}
