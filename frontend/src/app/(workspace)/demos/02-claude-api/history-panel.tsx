"use client";
import { Alert, Card, Empty, Flex, Space, Tag, Typography } from "antd";
import CodeBlock from "@/components/CodeBlock";
import type { Turn } from "./api";

// Một lần Send đã thực hiện, dùng để so sánh request có history và không có history.
export type SentRequest = {
  messages: Turn[]; // Đúng mảng messages backend đã gửi cho Claude.
  withHistory: boolean;
  inputTokens: number | null;
  answer: string;
};

type Props = { turns: Turn[]; sent: SentRequest[] };

export default function HistoryPanel({ turns, sent }: Props) {
  return (
    <Card size="small" title="History — ai là người giữ lịch sử?">
      <Flex vertical gap={12}>
        <Alert type="info" showIcon
          title="Messages API không có memory: Claude chỉ thấy đúng mảng messages của request hiện tại."
          description="Lịch sử dưới đây nằm trong state của trang web này; bật/tắt công tắc chỉ quyết định có đính kèm nó vào request kế tiếp hay không." />
        <div>
          <Typography.Text strong>Conversation đang lưu ở frontend ({turns.length} turn)</Typography.Text>
          {turns.length === 0
            ? <Empty description="Chưa có turn nào. Gửi câu 1, rồi gửi câu 2 để so sánh." />
            : <Flex vertical gap={4} style={{ marginTop: 8 }}>
                {turns.map((turn, index) => (
                  <Typography.Paragraph key={`${turn.role}-${index}`} style={{ margin: 0 }}>
                    <Tag color={turn.role === "user" ? "blue" : "green"}>{turn.role}</Tag>
                    {turn.content.length > 160 ? `${turn.content.slice(0, 160)}…` : turn.content}
                  </Typography.Paragraph>
                ))}
              </Flex>}
        </div>
        {sent.map((request, index) => (
          <Space key={index} direction="vertical" size={4} style={{ width: "100%" }}>
            <Space wrap>
              <Typography.Text strong>Send #{index + 1}</Typography.Text>
              <Tag color={request.withHistory ? "blue" : "default"}>
                history {request.withHistory ? "ON" : "OFF"}
              </Tag>
              <Tag>messages[] = {request.messages.length} turn</Tag>
              <Tag>input_tokens = {request.inputTokens ?? "n/a"}</Tag>
            </Space>
            <CodeBlock title={`messages[] đã gửi ở Send #${index + 1}`}
              code={JSON.stringify(request.messages, null, 2)} />
            <Typography.Text type="secondary">Claude trả lời: {request.answer}</Typography.Text>
          </Space>
        ))}
      </Flex>
    </Card>
  );
}
