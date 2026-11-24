"use client";

import { Flex, Segmented, Typography } from "antd";
import { useState } from "react";
import MessagesPanel from "./messages-panel";
import SdkPanel from "./sdk-panel";

const { Text, Title, Paragraph } = Typography;

type Mode = "messages" | "sdk";

export default function TestClaudeSdkPage() {
  const [mode, setMode] = useState<Mode>("messages");
  const [prompt, setPrompt] = useState("Trả lời ngắn gọn: 2+2 bằng mấy?");

  return (
    <Flex vertical gap={16} style={{ maxWidth: 720 }}>
      <div>
        <Text type="secondary">Sandbox</Text>
        <Title level={2} style={{ margin: "4px 0 8px" }}>
          Test Claude
        </Title>
        <Paragraph type="secondary" style={{ marginBottom: 8 }}>
          Mặc định <strong>Messages API</strong> — prompt ngắn, ổn trên mạng hiện tại. Tab SDK chỉ khi cần thử CLI.
        </Paragraph>
        <Segmented
          value={mode}
          onChange={(value) => setMode(value as Mode)}
          options={[
            { label: "Messages API", value: "messages" },
            { label: "Agent SDK", value: "sdk" },
          ]}
        />
      </div>
      {mode === "messages" ? (
        <MessagesPanel prompt={prompt} onPromptChange={setPrompt} />
      ) : (
        <SdkPanel prompt={prompt} onPromptChange={setPrompt} onSuggestMessages={() => setMode("messages")} />
      )}
    </Flex>
  );
}