"use client";

import { Flex, Layout, Space, Tag, Typography, theme } from "antd";
import { useEffect, useState } from "react";
import DemoMenu from "@/components/DemoMenu";
import { getHealth, type Health } from "@/lib/api";

const { Header, Sider, Content } = Layout;

// Shell dùng chung cho mọi demo, mount một lần trong app/(workspace)/layout.tsx.
// Chuyển menu chỉ đổi {children} (Main Content); Header, Sidebar và state health giữ nguyên.
export default function PlaygroundShell({ children }: { children: React.ReactNode }) {
  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState(false);
  const { token } = theme.useToken();

  useEffect(() => {
    getHealth().then(setHealth).catch(() => setHealthError(true));
  }, []);

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header style={{ borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
        <Flex align="center" justify="space-between" style={{ height: "100%" }} gap={16}>
          <Typography.Text strong style={{ fontSize: 17 }}>
            ◈ AI Agent Demo Workspace
            <Typography.Text type="secondary" style={{ marginInlineStart: 12 }}>
              Claude Agent mechanics, chạy thật
            </Typography.Text>
          </Typography.Text>
          <Space wrap size={4}>
            {healthError && <Tag color="error">Backend offline</Tag>}
            {health && <Tag color="success">Backend online</Tag>}
            {health && (health.llm_configured
              ? <Tag color="blue">Model: {health.model}</Tag>
              : <Tag color="warning">LLM chưa cấu hình</Tag>)}
            <Tag>No secrets in UI</Tag>
          </Space>
        </Flex>
      </Header>
      <Layout>
        <Sider width={260} breakpoint="lg" collapsedWidth={0}
          style={{ borderInlineEnd: `1px solid ${token.colorBorderSecondary}` }}>
          <DemoMenu />
        </Sider>
        <Content style={{ padding: 24, minWidth: 0 }}>
          <div style={{ maxWidth: 1280, margin: "0 auto" }}>{children}</div>
        </Content>
      </Layout>
    </Layout>
  );
}
