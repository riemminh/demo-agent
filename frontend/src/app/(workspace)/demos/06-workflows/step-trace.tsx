"use client";
import { Card, Collapse, Empty, Flex, Space, Tag, Typography, theme } from "antd";
import { MONO_FONT } from "@/theme/theme";
import type { WorkflowStep } from "./api";

// Thanh thời gian vẽ từ start_ms/end_ms thật của backend -> thấy ngay bước nào chồng nhau.
function TimingBar({ step, totalMs }: { step: WorkflowStep; totalMs: number }) {
  const { token } = theme.useToken();
  const left = totalMs > 0 ? (step.start_ms / totalMs) * 100 : 0;
  const width = totalMs > 0 ? Math.max(((step.end_ms - step.start_ms) / totalMs) * 100, 0.8) : 0;
  return (
    <div style={{ position: "relative", height: 8, background: token.colorFillQuaternary, borderRadius: 4 }}>
      <div style={{
        position: "absolute", left: `${left}%`, width: `${width}%`, height: "100%", borderRadius: 4,
        background: step.kind === "llm" ? token.colorPrimary : token.colorWarning,
      }} />
    </div>
  );
}

export default function StepTrace({ steps, totalMs, running }: {
  steps: WorkflowStep[];
  totalMs: number;
  running: boolean;
}) {
  return (
    <Card size="small" title={`Execution Events — ${steps.length} step`}>
      <Typography.Paragraph type="secondary">
        <Tag color="blue">llm</Tag> = một request Claude thật · <Tag color="orange">code</Tag> = quyết định
        của Python. Thanh thời gian và số ms đều do backend đo.
      </Typography.Paragraph>
      {steps.length === 0
        ? <Empty description={running ? "Đang chạy…" : "Chưa có step."} />
        : <Flex vertical gap={10}>
            {steps.map((step, index) => (
              <div key={`${step.name}-${index}`}>
                <Space wrap size={4} style={{ marginBottom: 4 }}>
                  <Tag color={step.kind === "llm" ? "blue" : "orange"}>{step.kind}</Tag>
                  <Typography.Text strong>{step.name}</Typography.Text>
                  <Typography.Text type="secondary">
                    {Math.round(step.start_ms)} → {Math.round(step.end_ms)} ms
                    {step.kind === "llm" && ` (${Math.round(step.end_ms - step.start_ms)} ms)`}
                  </Typography.Text>
                  {step.usage && <Tag>{step.usage.input_tokens} in / {step.usage.output_tokens} out</Tag>}
                  {step.stop_reason && <Tag>{step.stop_reason}</Tag>}
                </Space>
                <TimingBar step={step} totalMs={totalMs} />
                {step.detail && (
                  <Typography.Paragraph type="secondary" style={{ margin: "4px 0 0" }}>
                    {step.detail}
                  </Typography.Paragraph>
                )}
                {step.kind === "llm" && (
                  <Collapse size="small" style={{ marginTop: 6 }} items={[{
                    key: "io",
                    label: "prompt & output của step này",
                    children: (
                      <Flex vertical gap={6}>
                        <Typography.Text type="secondary">Prompt</Typography.Text>
                        <pre style={{ margin: 0, fontFamily: MONO_FONT, fontSize: 13,
                          whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{step.prompt}</pre>
                        <Typography.Text type="secondary">Output</Typography.Text>
                        <pre style={{ margin: 0, fontFamily: MONO_FONT, fontSize: 13,
                          whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{step.output}</pre>
                      </Flex>
                    ),
                  }]} />
                )}
              </div>
            ))}
          </Flex>}
    </Card>
  );
}
