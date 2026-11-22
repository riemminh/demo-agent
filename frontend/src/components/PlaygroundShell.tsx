"use client";

import { Flex, Layout, Space, Tag, Typography } from "antd";
import Link from "next/link";
import { useEffect, useState } from "react";
import LessonMenu from "@/components/LessonMenu";
import { getHealth, type Health } from "@/lib/api";

const { Header, Sider, Content } = Layout;

export default function PlaygroundShell({ children }: { children: React.ReactNode }) {
  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState(false);

  useEffect(() => {
    getHealth().then(setHealth).catch(() => setHealthError(true));
  }, []);

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header>
        <Flex align="center" justify="space-between" style={{ height: "100%" }} gap={16}>
          <Typography.Text strong style={{ color: "#fff", fontSize: 17 }}>
            ◈ AI Task Manager Workspace
            <Typography.Text style={{ color: "#AFC0D6", marginInlineStart: 12 }}>
              Claude Agent mechanics, chạy thật
            </Typography.Text>
          </Typography.Text>
          <Space wrap size={4}>
            {healthError && <Tag color="error">Backend offline</Tag>}
            {health && <Tag color="success">Backend online</Tag>}
            {health && (health.llm_configured
              ? <Tag color="blue">Model: {health.model}</Tag>
              : <Tag color="warning">LLM chưa cấu hình</Tag>)}
            <Link href="/"><Tag>Legacy SSE demo</Tag></Link>
          </Space>
        </Flex>
      </Header>
      <Layout>
        <Sider width={280} breakpoint="lg" collapsedWidth={0}
          style={{ borderInlineEnd: "1px solid #DCE3EC" }}>
          <LessonMenu />
        </Sider>
        <Content style={{ padding: 24, minWidth: 0 }}>
          <div style={{ maxWidth: 1280, margin: "0 auto" }}>{children}</div>
        </Content>
      </Layout>
    </Layout>
  );
}
