"use client";

import { Alert, Button, Card, Collapse, Flex, Input, Space, Spin, Switch, Tag, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import CodeBlock from "@/components/CodeBlock";
import { getEnv, type Env, type SdkEvent } from "../demos/08-agent-sdk/api";
import { useSdkRun } from "../demos/08-agent-sdk/use-sdk-run";
import {
  failureMessage,
  isNetworkFailure,
  isSdkFailure,
  mockEvents,
  pickAnswer,
} from "./helpers";

const { Paragraph, Text } = Typography;

type Props = {
  prompt: string;
  onPromptChange: (value: string) => void;
  onSuggestMessages: () => void;
};

export default function SdkPanel({ prompt, onPromptChange, onSuggestMessages }: Props) {
  const sdk = useSdkRun();
  const [env, setEnv] = useState<Env | null>(null);
  const [mockMode, setMockMode] = useState(false);
  const [mockRunning, setMockRunning] = useState(false);
  const [mockEventsState, setMockEventsState] = useState<SdkEvent[]>([]);

  useEffect(() => {
    void getEnv()
      .then(setEnv)
      .catch((error: Error) => sdk.setError(error.message));
  }, []);

  const events = mockMode ? mockEventsState : sdk.events;
  const running = mockMode ? mockRunning : sdk.running;
  const answer = useMemo(
    () => pickAnswer(events, mockMode ? "" : sdk.liveText),
    [events, mockMode, sdk.liveText],
  );
  const failed = isSdkFailure(events);
  const failText = failureMessage(events);
  const networkBlocked = Boolean(failText && isNetworkFailure(failText));
  const ready = Boolean(env?.cli_found && env.api_key_configured);

  async function run() {
    const text = prompt.trim();
    if (!text) return;
    if (mockMode) {
      setMockRunning(true);
      setMockEventsState([]);
      await new Promise((resolve) => setTimeout(resolve, 300));
      setMockEventsState(mockEvents(text));
      setMockRunning(false);
      return;
    }
    if (!ready) return;
    await sdk.run("basic", text);
  }

  return (
    <Flex vertical gap={16}>
      <Alert
        type="warning"
        showIcon
        title="Agent SDK (Demo 08 · Claude Code CLI)"
        description="Run và Inspect đều qua Claude Code CLI (claude trên PATH). Cần ANTHROPIC_API_KEY và LLM_MODEL trong backend/.env."
      />
      {sdk.sessionError && <Alert type="error" showIcon title={sdk.sessionError} />}
      {sdk.error && !mockMode && <Alert type="error" showIcon title={sdk.error} />}
      {failed && failText && (
        <Alert
          type="error"
          showIcon
          title={networkBlocked ? "ECONNRESET từ CLI" : "SDK run thất bại"}
          description={
            networkBlocked ? (
              <span>
                Chuyển sang tab <strong>Messages API</strong> để test prompt ngay, hoặc VPN/hotspot cho SDK.
                <Button type="link" size="small" onClick={onSuggestMessages} style={{ paddingLeft: 4 }}>
                  Mở Messages API
                </Button>
              </span>
            ) : (
              failText
            )
          }
        />
      )}
      {env && !ready && !mockMode && (
        <Alert
          type="warning"
          showIcon
          title="Môi trường SDK"
          description={
            <>
              {!env.cli_found && <div>Thiếu Claude Code CLI trong PATH.</div>}
              {!env.api_key_configured && <div>Thiếu ANTHROPIC_API_KEY.</div>}
            </>
          }
        />
      )}
      <Space wrap align="center">
        <Switch checked={mockMode} onChange={setMockMode} disabled={running} />
        <Text>Mock SDK</Text>
        {env && !mockMode && (
          <>
            <Tag color={env.cli_found ? "success" : "error"}>CLI</Tag>
            <Tag color={env.api_key_configured ? "success" : "error"}>key</Tag>
          </>
        )}
      </Space>
      <Card size="small" title="Prompt">
        <Flex vertical gap={12}>
          <Input.TextArea
            rows={4}
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            disabled={running}
          />
          <Space wrap>
            <Button
              type="primary"
              loading={running}
              disabled={!prompt.trim() || (!mockMode && !ready)}
              onClick={() => void run()}
            >
              Run SDK
            </Button>
            {!mockMode && (
              <Button onClick={() => void sdk.cancel()} disabled={!sdk.running}>
                Cancel
              </Button>
            )}
          </Space>
        </Flex>
      </Card>
      <Card
        size="small"
        title="Result"
        extra={running ? <Tag color="processing"><Spin size="small" /></Tag> : failed ? <Tag color="error">failed</Tag> : answer ? <Tag color="success">done</Tag> : <Tag>idle</Tag>}
      >
        {answer ? (
          <Paragraph style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>{answer}</Paragraph>
        ) : (
          <Text type="secondary">{running ? "Đang chờ CLI..." : "Chưa có output."}</Text>
        )}
      </Card>
      <Collapse
        size="small"
        items={[{ key: "ev", label: `Events (${events.length})`,
          children: <CodeBlock title="SSE trace" code={JSON.stringify(events, null, 2)} /> }]}
      />
    </Flex>
  );
}