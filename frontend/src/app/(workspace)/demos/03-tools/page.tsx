"use client";
import { Flex, Space, Tag, Typography } from "antd";
import { useEffect, useState } from "react";
import { getToolSchemas, runTools, type ScenarioName, type ToolRunResult } from "./api";
import { SCENARIOS } from "./content";
import EventLog from "./event-log";
import ResultCard from "./result-card";
import ScenarioInput from "./scenario-input";
import SourceDebug from "./source-debug";

const { Text, Paragraph } = Typography;
const MAX_TOKENS = 2048;

export default function ToolsDemoPage() {
  const [scenario, setScenario] = useState<ScenarioName>("single");
  const [prompt, setPrompt] = useState(SCENARIOS.single.presets[0]);
  const [result, setResult] = useState<ToolRunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [transportError, setTransportError] = useState("");
  const [toolSchemas, setToolSchemas] = useState<Record<string, unknown>[]>([]);

  // Chỉ lấy schema để hiển thị; không gọi Claude khi mở trang.
  useEffect(() => {
    getToolSchemas().then(setToolSchemas).catch(() => setToolSchemas([]));
  }, []);

  function changeScenario(next: ScenarioName) {
    setScenario(next);
    setPrompt(SCENARIOS[next].presets[0]);
    reset();
  }

  function reset() {
    setResult(null);
    setTransportError("");
  }

  async function run() {
    setRunning(true);
    reset();
    try {
      setResult(await runTools(scenario, prompt, MAX_TOKENS));
    } catch (error) {
      setTransportError(error instanceof Error ? error.message : String(error));
    } finally {
      setRunning(false);
    }
  }

  return (
    <Flex vertical gap={16}>
      <div>
        <Text type="secondary">03 · Tools & Registry</Text>
        <Typography.Title level={2} style={{ margin: "4px 0 8px" }}>
          Claude chọn tool · Python thực thi tool
        </Typography.Title>
        <Paragraph style={{ marginBottom: 8 }}>
          Model không chạy được code. Nó chỉ trả về block <Text code>tool_use</Text> gồm tên tool và input;
          registry trong Python mới gọi hàm thật, rồi gửi <Text code>tool_result</Text> về để Claude chốt câu trả lời.
        </Paragraph>
        <Space wrap size={4}>
          <Tag color="geekblue">Claude API thật</Tag>
          <Tag>Một tool round (tối đa 2 request)</Tag>
          <Tag>Không eval/exec, input validate bằng Pydantic</Tag>
        </Space>
      </div>
      <ScenarioInput scenario={scenario} prompt={prompt} running={running}
        onScenarioChange={changeScenario} onPromptChange={setPrompt} onRun={run} onReset={reset} />
      <ResultCard result={result} running={running} transportError={transportError} />
      <EventLog events={result?.events ?? []} running={running} />
      <SourceDebug result={result} toolSchemas={toolSchemas} />
    </Flex>
  );
}
