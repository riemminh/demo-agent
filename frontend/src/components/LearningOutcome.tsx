"use client";

import { TrophyOutlined } from "@ant-design/icons";
import { Card, Flex, Space, Typography, theme } from "antd";

export type OutcomeItem = { label?: string; text: string };

// Khối "Kết quả cần đạt" dùng chung cho lesson và module để luôn nổi bật, cùng một kiểu.
export default function LearningOutcome({ items, title = "Kết quả cần đạt" }: {
  items: OutcomeItem[];
  title?: string;
}) {
  const { token } = theme.useToken();
  return (
    <Card
      size="small"
      style={{ borderColor: token.colorSuccessBorder, background: token.colorSuccessBg }}
      title={
        <Space>
          <TrophyOutlined style={{ color: token.colorSuccess }} />
          <span>{title}</span>
        </Space>
      }
    >
      <Flex vertical gap={6}>
        {items.map((item) => (
          <Typography.Paragraph key={item.text} style={{ margin: 0 }}>
            {item.label && <Typography.Text strong>{item.label}: </Typography.Text>}
            {item.text}
          </Typography.Paragraph>
        ))}
      </Flex>
    </Card>
  );
}
