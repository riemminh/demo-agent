"use client";
import { Flex, Space, Tag, Typography } from "antd";
import { useEffect, useState } from "react";
import LearningOutcome from "@/components/LearningOutcome";
import { getCaps, runWorkflow, type Caps, type PatternName, type WorkflowResult } from "./api";
import { OUTCOMES, PATTERNS } from "./content";
import ResultCard from "./result-card";
import ScenarioInput from "./scenario-input";
import SourceDebug from "./source-debug";
import StepTrace from "./step-trace";

const { Text, Paragraph } = Typography;

export default function WorkflowsDemoPage() {
  const [pattern, setPattern] = useState<PatternName>("chaining");
  const [input, setInput] = useState(PATTERNS.chaining.presets[0]);
  const [result, setResult] = useState<WorkflowResult | null>(null);
  const [running, setRunning] = useState(false);
  const [transportError, setTransportError] = useState("");
  const [caps, setCaps] = useState<Caps | null>(null);

  // Chỉ đọc budget/cap để hiển thị; không gọi Claude khi mở trang.
  useEffect(() => {
    getCaps().then(setCaps).catch(() => setCaps(null));
  }, []);

  function changePattern(next: PatternName) {
    setPattern(next);
    setInput(PATTERNS[next].presets[0]);
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
      setResult(await runWorkflow(pattern, input));
    } catch (error) {
      setTransportError(error instanceof Error ? error.message : String(error));
    } finally {
      setRunning(false);
    }
  }

  const totalMs = result?.metrics?.latency_ms ?? 0;

  return (
    <Flex vertical gap={16}>
      <div>
        <Text type="secondary">06 · Agent Workflows</Text>
        <Typography.Title level={2} style={{ margin: "4px 0 8px" }}>
          Năm pattern · ai quyết định cấu trúc?
        </Typography.Title>
        <Paragraph style={{ marginBottom: 8 }}>
          Không phải bài toán nào cũng cần agent tự quyết định. Mỗi pattern dưới đây chỉ là Python
          + Claude API: code giữ cấu trúc (thứ tự, nhánh, song song, cap), model lo nội dung và vài
          quyết định được hỏi tường minh. Trace bên dưới là thời gian thật do backend đo.
        </Paragraph>
        <Space wrap size={4}>
          <Tag color="geekblue">Claude API thật</Tag>
          <Tag>Budget call cho từng pattern</Tag>
          <Tag>Không framework, không DB</Tag>
          <Tag>max_tokens 220 mỗi call</Tag>
        </Space>
      </div>
      <ScenarioInput pattern={pattern} input={input} running={running} caps={caps}
        onPatternChange={changePattern} onInputChange={setInput} onRun={run} onReset={reset} />
      <ResultCard result={result} running={running} transportError={transportError} />
      <StepTrace steps={result?.steps ?? []} totalMs={totalMs} running={running} />
      <SourceDebug pattern={pattern} />
      <LearningOutcome items={OUTCOMES} />
    </Flex>
  );
}
