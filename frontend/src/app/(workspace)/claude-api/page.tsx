"use client";

import { Col, Flex, Row, Space, Tag, Typography } from "antd";
import { useEffect, useRef, useState } from "react";
import LearningOutcome from "@/components/LearningOutcome";
import { API_URL, getHealth, type Health } from "@/lib/api";
import ConceptSection from "./concept-section";
import { OUTCOMES } from "./content";
import DemoForm from "./demo-form";
import DraftResult from "./draft-result";
import ExecutionTrace from "./execution-trace";
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

export default function ClaudeApiDemo() {
  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [source, setSource] = useState<SourceFile | null>(null);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [run, setRun] = useState<RunRecord | null>(null);
  const [draft, setDraft] = useState(""); // Bản người dùng sửa; answer gốc vẫn nằm trong run.result.
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
    setDraft("");
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
      setDraft(lessonResult?.answer ?? "");
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

  function resetView() {
    setRun(null);
    setDraft("");
  }

  return (
    <Flex vertical gap={16}>
      <div>
        <Typography.Text type="secondary">02 · Claude API · Scenario: One-shot</Typography.Text>
        <Typography.Title level={2} style={{ margin: "4px 0 8px" }}>Generate Task Description</Typography.Title>
        <Typography.Paragraph style={{ marginBottom: 8 }}>
          Nhập task title và requirements, bấm Generate: backend gọi Claude đúng 1 request và trả về bản
          mô tả để bạn copy hoặc sửa. Preset Leave Email viết email xin nghỉ phép theo cùng cơ chế.
        </Typography.Paragraph>
        <Space wrap size={4}>
          <Tag color="purple">Claude API thật · 1 request</Tag>
          {health && (health.llm_configured
            ? <Tag color="blue">model: {health.model}</Tag>
            : <Tag color="warning">Live verification pending: thiếu {health.missing_env.join(", ")}</Tag>)}
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <DemoForm health={health} healthError={healthError} running={running}
            onRun={runDemo} onReset={resetView} />
        </Col>
        <Col xs={24} lg={14}>
          <DraftResult run={run} running={running} draft={draft} onDraftChange={setDraft} />
        </Col>
      </Row>

      <MetricsSection run={run} />
      <ExecutionTrace run={run} running={running} />
      <InspectorTabs run={run} running={running} source={source} sourceError={sourceError} />
      <ConceptSection />
      <LearningOutcome items={OUTCOMES} />
    </Flex>
  );
}
