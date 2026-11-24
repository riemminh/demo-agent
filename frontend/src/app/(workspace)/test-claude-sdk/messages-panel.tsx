"use client";

import { Alert, Button, Card, Collapse, Flex, Input, Space, Spin, Tag, Typography } from "antd";
import { useClaude } from "../demos/02-claude-api/use-claude";
import CodeBlock from "@/components/CodeBlock";

const { Paragraph, Text } = Typography;

type Props = {
  prompt: string;
  onPromptChange: (value: string) => void;
  disabled?: boolean;
};

export default function MessagesPanel({ prompt, onPromptChange, disabled }: Props) {
  const claude = useClaude();

  async function run() {
    const text = prompt.trim();
    if (!text) return;
    await claude.send({ messages: [{ role: "user", content: text }], max_tokens: 512 }, false);
  }

  const failed = claude.result?.status === "failed";
  const answer = claude.result?.answer ?? "";
  const running = claude.running;

  return (
  <Flex vertical gap={16}>
    <Alert
      type="info"
      showIcon
      title="Messages API (Demo 02)"
      description="Gọi Claude trực tiếp qua backend — body nhỏ, thường qua được mạng công ty. Dùng chế độ này để test prompt trước."
    />
    {claude.transportError && <Alert type="error" showIcon title={claude.transportError} />}
    {failed && claude.result?.error && (
      <Alert type="error" showIcon title={claude.result.error.message} />
    )}
    <Card size="small" title="Prompt">
      <Flex vertical gap={12}>
        <Input.TextArea
          rows={4}
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          disabled={disabled || running}
        />
        <Space wrap>
          <Button type="primary" loading={running} disabled={!prompt.trim() || disabled} onClick={() => void run()}>
            Run
          </Button>
          <Button onClick={() => claude.reset()} disabled={running}>
            Clear result
          </Button>
        </Space>
      </Flex>
    </Card>
    <Card
      size="small"
      title="Result"
      extra={
        running ? (
          <Tag color="processing">
            <Spin size="small" /> running
          </Tag>
        ) : answer ? (
          <Tag color="success">done</Tag>
        ) : failed ? (
          <Tag color="error">failed</Tag>
        ) : (
          <Tag>idle</Tag>
        )
      }
    >
      {answer ? (
        <Paragraph style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>{answer}</Paragraph>
      ) : (
        <Text type="secondary">{running ? "Đang gọi API..." : "Chưa có output."}</Text>
      )}
    </Card>
    {claude.result && (
      <Collapse
        size="small"
        items={[
          {
            key: "raw",
            label: "Raw response",
            children: <CodeBlock title="JSON" code={JSON.stringify(claude.result, null, 2)} />,
          },
        ]}
      />
    )}
  </Flex>
  );
}