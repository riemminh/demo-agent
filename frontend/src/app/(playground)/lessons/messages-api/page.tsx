"use client";

import { Alert, Flex, Space, Tag, Typography } from "antd";
import { useEffect, useRef, useState } from "react";
import KnowledgeCheckpoint from "@/components/KnowledgeCheckpoint";
import LearningOutcome from "@/components/LearningOutcome";
import LessonNav from "@/components/LessonNav";
import { API_URL, getHealth, type Health } from "@/lib/api";
import ConceptSection from "./concept-section";
import { CHECKPOINT, OUTCOMES } from "./content";
import DemoForm from "./demo-form";
import InspectorTabs from "./inspector-tabs";
import MetricsSection from "./metrics-section";
import type { SourceFile } from "./source-tab";
import type { DemoInput, MessagesApiResult, RunRecord } from "./types";

// Body lỗi không theo contract lesson (vd 422 của FastAPI): { detail: string | [{loc, msg}] }.
function describeError(body: unknown, status: number): string {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string") return `HTTP ${status}: ${detail}`;
  if (Array.isArray(detail)) {
    return `HTTP ${status}: ` + detail
      .map((d: { loc?: unknown[]; msg?: string }) => `${d.loc?.slice(1).join(".")}: ${d.msg}`).join("; ");
  }
  return `HTTP ${status}: response không đúng định dạng`;
}

function isLessonResult(body: unknown): body is MessagesApiResult {
  return typeof body === "object" && body !== null && "status" in body && "metrics" in body;
}

export default function MessagesApiLesson() {
  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [source, setSource] = useState<SourceFile | null>(null);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [run, setRun] = useState<RunRecord | null>(null);
  const inFlight = useRef(false); // Chặn double-click ngay lập tức, trước khi state kịp render lại.

  // Lúc load page chỉ gọi health + source (không gọi Claude).
  useEffect(() => {
    getHealth().then(setHealth).catch((e: Error) => setHealthError(e.message));
    fetch(`${API_URL}/api/lessons/messages-api/source`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        setSource((await r.json()) as SourceFile);
      })
      .catch((e: Error) => setSourceError(e.message));
  }, []);

  async function runDemo(input: DemoInput) {
    if (inFlight.current) return;
    inFlight.current = true;
    setRunning(true);
    setRun(null);
    const sentAt = new Date();
    const started = performance.now();
    try {
      const response = await fetch(`${API_URL}/api/lessons/messages-api`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        // Lớn hơn LLM_TIMEOUT_SECONDS của backend. Abort ở browser KHÔNG hủy request backend.
        signal: AbortSignal.timeout(((health?.timeout_seconds ?? 30) + 15) * 1000),
      });
      const body: unknown = await response.json().catch(() => null);
      const lessonResult = isLessonResult(body) ? body : null;
      setRun({
        sentAt, roundTripMs: performance.now() - started, httpStatus: response.status,
        result: lessonResult, clientError: lessonResult ? null : describeError(body, response.status),
      });
    } catch (e) {
      setRun({
        sentAt, roundTripMs: performance.now() - started, httpStatus: null, result: null,
        clientError: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
      });
    } finally {
      inFlight.current = false;
      setRunning(false);
    }
  }

  const error = run?.result?.error;
  return (
    <Flex vertical gap={16}>
      <div>
        <Typography.Text type="secondary">Module 2 · Claude API Mechanics / Lesson 06</Typography.Text>
        <Typography.Title level={2} style={{ margin: "4px 0 8px" }}>Basic Messages API</Typography.Title>
        <Space wrap size={4}>
          <Tag color="purple">Live</Tag>
          <Tag>Domain 1.2 · 2.3</Tag>
          <Tag>/lessons/messages-api</Tag>
          <Tag color="processing">Available</Tag>
          <Tag color="warning">Live verification pending</Tag>
        </Space>
        <Typography.Paragraph style={{ marginTop: 12 }}>
          Gọi Claude đúng một lần qua REST để viết email xin nghỉ phép 1 ngày, rồi đọc từng field của
          request và response thật. Đây là nền móng cho mọi lesson sau.
        </Typography.Paragraph>
      </div>

      <ConceptSection />
      <DemoForm health={health} healthError={healthError} running={running}
        onRun={runDemo} onReset={() => setRun(null)} />

      {run?.result?.status === "succeeded" && (
        <Alert type="success" showIcon title={`Claude trả lời thành công · HTTP ${run.httpStatus} · stop_reason = ${run.result.response?.stop_reason}`} />
      )}
      {error && (
        <Alert type="error" showIcon title={`Lỗi ${error.kind}${error.upstream_status ? ` · Anthropic HTTP ${error.upstream_status}` : ""} · backend HTTP ${run?.httpStatus}`}
          description={error.message} />
      )}
      {run?.clientError && <Alert type="error" showIcon title="Request không thành công" description={run.clientError} />}

      <InspectorTabs run={run} running={running} source={source} sourceError={sourceError} />
      <MetricsSection run={run} />
      <LearningOutcome items={OUTCOMES} />
      <KnowledgeCheckpoint questions={CHECKPOINT} />
      <LessonNav lessonId="06" />
    </Flex>
  );
}
