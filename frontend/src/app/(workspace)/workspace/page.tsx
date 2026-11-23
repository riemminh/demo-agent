"use client";

import { ArrowRightOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Col, Descriptions, Flex, Row, Tag, Typography } from "antd";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getHealth, type Health } from "@/lib/api";
import { LIVE_DEMOS, ROADMAP_DEMOS } from "@/lib/demos";

const { Text, Paragraph } = Typography;

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
        <Typography.Title level={2} style={{ margin: "4px 0 8px" }}>AI Agent Demo Workspace</Typography.Title>
        <Paragraph style={{ marginBottom: 0 }}>
          Mỗi menu là một demo tương tác: chọn scenario, bấm Run, xem Actual Result và Execution Events,
          mở Source Code ở breakpoint rồi đọc Kết quả cần đạt.
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

      <Typography.Title level={4} style={{ margin: 0 }}>Demo chạy được</Typography.Title>
      <Row gutter={[16, 16]}>
        {LIVE_DEMOS.map((demo) => (
          <Col key={demo.id} xs={24} md={12}>
            <Card size="small" style={{ height: "100%" }} title={`${demo.id} · ${demo.title}`}
              actions={[
                // <Link> (không dùng Button href) để điều hướng client-side, giữ nguyên Header + Sidebar.
                <Link key="open" href={demo.route}>
                  <Button type="primary" icon={<ArrowRightOutlined />} iconPlacement="end">Mở demo</Button>
                </Link>,
              ]}>
              <Paragraph style={{ marginBottom: 6 }}><Text strong>Cơ chế: </Text>{demo.mechanism}</Paragraph>
              <Flex wrap gap={4} align="center">
                <Text strong>Scenario: </Text>
                {demo.scenarios.map((name) => <Tag key={name} color="blue">{name}</Tag>)}
              </Flex>
              {demo.plannedScenarios && (
                <Paragraph type="secondary" style={{ margin: "6px 0 0" }}>
                  Chưa triển khai: {demo.plannedScenarios.join(" · ")}
                </Paragraph>
              )}
            </Card>
          </Col>
        ))}
      </Row>

      <Typography.Title level={4} style={{ margin: 0 }}>Roadmap (chưa triển khai)</Typography.Title>
      <Text type="secondary">
        Chưa có code chạy được nên không có trang, không có nút Run và không nằm trên sidebar. Làm xong demo nào mới thêm vào menu.
      </Text>
      <Card size="small">
        <Flex vertical gap={8}>
          {ROADMAP_DEMOS.map((demo) => (
            <Paragraph key={demo.id} style={{ margin: 0 }}>
              <Text strong>{demo.id} · {demo.title}</Text>
              <Text type="secondary"> — {demo.mechanism} Scenario dự kiến: {demo.scenarios.join(" · ")}.</Text>
            </Paragraph>
          ))}
        </Flex>
      </Card>
    </Flex>
  );
}
