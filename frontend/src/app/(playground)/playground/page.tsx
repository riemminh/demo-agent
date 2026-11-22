"use client";

import { ArrowRightOutlined, CheckOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Col, Flex, Row, Statistic, Tag, Typography } from "antd";
import Link from "next/link";
import LearningOutcome from "@/components/LearningOutcome";
import { ALL_LESSONS, ENGINEERING_OUTCOME, MODULES, STATUS_TAG, type Lesson } from "@/lib/lessons";
import { useStudied } from "@/lib/studied";

const countBy = (status: Lesson["status"]) => ALL_LESSONS.filter((l) => l.status === status).length;

function LessonRow({ lesson, studied }: { lesson: Lesson; studied: boolean }) {
  const status = STATUS_TAG[lesson.status];
  const text = `${lesson.id} · ${lesson.title}`;
  return (
    <Flex gap={8} align="baseline" wrap>
      <Tag color={status.color}>{status.label}</Tag>
      {studied && <Tag icon={<CheckOutlined />} color="green">Studied</Tag>}
      {lesson.route ? <Link href={lesson.route}>{text}</Link> : <Typography.Text type="secondary">{text}</Typography.Text>}
      {lesson.note && <Typography.Text type="secondary" style={{ fontSize: 13 }}>{lesson.note}</Typography.Text>}
    </Flex>
  );
}

export default function PlaygroundHome() {
  const { studied } = useStudied();
  return (
    <Flex vertical gap={16}>
      <div>
        <Typography.Text type="secondary">Learning roadmap · 8 modules · 36 lessons · final SDK project</Typography.Text>
        <Typography.Title level={2} style={{ margin: "4px 0 8px" }}>
          From first API call to real AI Task Manager Agent
        </Typography.Title>
        <Typography.Paragraph>
          Học từng cơ chế độc lập bằng code thật. Final app là AI Task Manager dùng Claude Agent SDK,
          SQLite và filesystem thật. Trang này không gọi Claude.
        </Typography.Paragraph>
      </div>

      <Alert type="info" showIcon title="Status phản ánh implementation thực tế"
        description="Completed: đã implement theo Plan V2 và đã verify. Available: chạy được nhưng chưa verify đủ hoặc là demo legacy. Coming Soon: chưa implement, không mở được. Studied là trạng thái học do bạn tự đánh dấu (lưu localStorage), không ảnh hưởng implementation status." />

      <Card size="small">
        <Flex wrap gap={48} align="center">
          <Statistic title="Completed" value={countBy("completed")} suffix="/ 36" />
          <Statistic title="Available" value={countBy("available")} suffix="/ 36" />
          <Statistic title="Coming Soon" value={countBy("coming_soon")} suffix="/ 36" />
          <Statistic title="Studied (bạn tự đánh dấu)" value={studied.length} suffix="/ 36" />
          <Button type="primary" href="/lessons/messages-api" icon={<ArrowRightOutlined />}>
            Tiếp tục: 06 · Basic Messages API
          </Button>
        </Flex>
      </Card>

      <Row gutter={[16, 16]}>
        {MODULES.map((module, index) => (
          <Col key={module.id} xs={24} xl={12}>
            <Card size="small" style={{ height: "100%" }}
              title={`0${index + 1} · ${module.title}`}
              extra={<Tag>{module.lessons.length} lessons</Tag>}>
              <Flex vertical gap={6} style={{ marginBottom: 12 }}>
                {module.lessons.map((lesson) => <LessonRow key={lesson.id} lesson={lesson} studied={studied.includes(lesson.id)} />)}
              </Flex>
              <LearningOutcome title="Kết quả cần đạt của module" items={[{ text: module.outcome }]} />
            </Card>
          </Col>
        ))}
        <Col xs={24} xl={12}>
          <Card size="small" style={{ height: "100%" }} title="09 · Application Design & Engineering"
            extra={<Tag>xuyên suốt</Tag>}>
            <Typography.Paragraph type="secondary">
              Không phải lesson riêng: requirements, separation of concerns, type safety, reliability,
              security, observability được dạy qua code của từng lesson.
            </Typography.Paragraph>
            <LearningOutcome title="Kết quả cần đạt của module" items={[{ text: ENGINEERING_OUTCOME }]} />
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card size="small" style={{ height: "100%" }} title="★ Final — AI Task Manager Agent"
            extra={<Tag>{STATUS_TAG.coming_soon.label}</Tag>}>
            <Typography.Paragraph>
              Đọc tài liệu → đề xuất task → approval → lưu SQLite → ghi report Markdown → hỏi tiếp và cập nhật task.
            </Typography.Paragraph>
            <Typography.Text type="secondary">Chưa implement. Route /workspace chưa tồn tại.</Typography.Text>
          </Card>
        </Col>
      </Row>
    </Flex>
  );
}
