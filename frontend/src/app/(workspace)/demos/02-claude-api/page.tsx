"use client";
import { Flex, Space, Tag, Typography } from "antd";
import { useState } from "react";
import type { Turn } from "./api";
import { SCENARIOS, type ScenarioKey } from "./content";
import EventLog from "./event-log";
import HistoryPanel, { type SentRequest } from "./history-panel";
import ResultCard from "./result-card";
import ScenarioInput from "./scenario-input";
import SourceDebug from "./source-debug";
import LlmNetworkAlert from "@/components/LlmNetworkAlert";
import { useClaude } from "./use-claude";

const { Text, Paragraph } = Typography;

export default function ClaudeApiDemoPage() {
  const run = useClaude();
  const [scenarioKey, setScenarioKey] = useState<ScenarioKey>("one-shot");
  const [prompt, setPrompt] = useState(SCENARIOS["one-shot"].presets[0].prompt);
  const [system, setSystem] = useState("");
  const [maxTokens, setMaxTokens] = useState(2048);
  const [includeHistory, setIncludeHistory] = useState(false);
  // Lịch sử hội thoại do FRONTEND giữ; Claude không tự nhớ gì.
  const [turns, setTurns] = useState<Turn[]>([]);
  const [sent, setSent] = useState<SentRequest[]>([]);
  const scenario = SCENARIOS[scenarioKey];

  function changeScenario(key: ScenarioKey) {
    setScenarioKey(key);
    setPrompt(SCENARIOS[key].presets[0].prompt);
    run.reset();
  }

  function resetAll() {
    run.reset();
    setTurns([]);
    setSent([]);
  }

  async function send() {
    const newTurn: Turn = { role: "user", content: prompt.trim() };
    const withHistory = scenarioKey === "history" && includeHistory;
    // messages[] là TOÀN BỘ những gì Claude được thấy ở request này.
    const messages = withHistory ? [...turns, newTurn] : [newTurn];
    const result = await run.send({ messages, system, max_tokens: maxTokens }, scenario.streaming);
    if (scenarioKey !== "history" || result?.status !== "succeeded" || !result.answer) return;
    // Chỉ scenario History mới tích lũy hội thoại để so sánh request kế tiếp.
    setTurns([...turns, newTurn, { role: "assistant", content: result.answer }]);
    setSent([...sent, {
      messages: result.request?.messages ?? messages, withHistory,
      inputTokens: result.metrics.input_tokens, answer: result.answer,
    }]);
  }

  return (
    <Flex vertical gap={16}>
      <LlmNetworkAlert />
      <div>
        <Text type="secondary">02 · Claude API</Text>
        <Typography.Title level={2} style={{ margin: "4px 0 8px" }}>
          Messages API · History · Streaming
        </Typography.Title>
        <Paragraph style={{ marginBottom: 8 }}>
          Trước khi có Agent Loop, ứng dụng cần hiểu một request Claude gồm gì, response trả về gì,
          ai giữ lịch sử và streaming đi qua mấy tầng. Mọi số liệu dưới đây lấy từ response thật.
        </Paragraph>
        <Space wrap size={4}>
          <Tag color="geekblue">Claude API thật</Tag>
          <Tag>max_retries = 0</Tag>
          <Tag>thinking: disabled</Tag>
          <Tag>Không tool call, không Agent Loop</Tag>
        </Space>
      </div>
      <ScenarioInput scenarioKey={scenarioKey} prompt={prompt} system={system} maxTokens={maxTokens}
        includeHistory={includeHistory} turnCount={turns.length} running={run.running}
        onScenarioChange={changeScenario} onPromptChange={setPrompt} onSystemChange={setSystem}
        onMaxTokensChange={setMaxTokens} onIncludeHistoryChange={setIncludeHistory}
        onSend={send} onReset={resetAll} />
      <ResultCard result={run.result} streamText={run.streamText} running={run.running}
        transportError={run.transportError} />
      {scenarioKey === "history" && <HistoryPanel turns={turns} sent={sent} />}
      <EventLog events={run.events} running={run.running} />
      <SourceDebug result={run.result} />
    </Flex>
  );
}
