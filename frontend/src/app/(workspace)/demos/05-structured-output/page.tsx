"use client";
import { Flex, Space, Tag, Typography } from "antd";
import { useEffect, useState } from "react";
import { generateDraft, getSchema, repairDraft, validateDraft, type DraftResult } from "./api";
import { PROMPT_PRESETS } from "./content";
import DraftEditor from "./draft-editor";
import EventLog from "./event-log";
import ResultCard from "./result-card";
import SourceDebug from "./source-debug";

const { Text, Paragraph } = Typography;
type Busy = "generate" | "validate" | "repair" | null;

export default function StructuredOutputDemoPage() {
  const [prompt, setPrompt] = useState(PROMPT_PRESETS[0]);
  const [draftJson, setDraftJson] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [result, setResult] = useState<DraftResult | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [transportError, setTransportError] = useState("");
  const [schema, setSchema] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    getSchema().then(setSchema).catch(() => setSchema(null)); // Chỉ đọc schema, không gọi Claude.
  }, []);

  const errors = [...(result?.schema_errors ?? []), ...(result?.semantic_errors ?? [])];

  async function act(stage: Exclude<Busy, null>, action: () => Promise<DraftResult>) {
    setBusy(stage);
    setTransportError("");
    try {
      const next = await action();
      setResult(next);
      // Object vừa nhận được nạp vào editor để bước Validate/Repair làm việc trên chính nó.
      if (next.raw !== null && next.raw !== undefined) {
        setDraftJson(JSON.stringify(next.raw, null, 2));
      }
    } catch (error) {
      setTransportError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(null);
    }
  }

  function parseDraftJson(): unknown | undefined {
    try {
      const parsed: unknown = JSON.parse(draftJson);
      setJsonError("");
      return parsed;
    } catch (error) {
      // Lỗi cú pháp JSON bắt ngay ở browser; backend chỉ nhận JSON đã parse được.
      setJsonError(error instanceof Error ? error.message : String(error));
      return undefined;
    }
  }

  function validate() {
    const draft = parseDraftJson();
    if (draft === undefined) return;
    void act("validate", () => validateDraft(draft));
  }

  function repair() {
    const draft = parseDraftJson();
    if (draft === undefined || errors.length === 0) return;
    void act("repair", () => repairDraft(draft, errors));
  }

  function reset() {
    setResult(null);
    setDraftJson("");
    setJsonError("");
    setTransportError("");
  }

  return (
    <Flex vertical gap={16}>
      <div>
        <Text type="secondary">05 · Structured Output</Text>
        <Typography.Title level={2} style={{ margin: "4px 0 8px" }}>
          Đúng schema chưa chắc đúng logic
        </Typography.Title>
        <Paragraph style={{ marginBottom: 8 }}>
          Claude trả object theo JSON Schema do SDK sinh từ Pydantic <Text code>TaskDraft</Text>. Nhưng đúng kiểu
          không có nghĩa là hợp lý: <Text code>estimated_hours = -4</Text> vẫn là float. App phải kiểm tra thêm
          tầng nghiệp vụ trước khi nhận kết quả.
        </Paragraph>
        <Space wrap size={4}>
          <Tag color="geekblue">Native structured output (messages.parse)</Tag>
          <Tag>Validate chạy offline trong Python</Tag>
          <Tag>Repair đúng 1 lần, có thể vẫn fail</Tag>
          <Tag>Không ghi DB</Tag>
        </Space>
      </div>
      <DraftEditor prompt={prompt} draftJson={draftJson} jsonError={jsonError} busy={busy}
        canRepair={errors.length > 0} onPromptChange={setPrompt} onDraftJsonChange={setDraftJson}
        onGenerate={() => void act("generate", () => generateDraft(prompt))}
        onValidate={validate} onRepair={repair} onReset={reset} />
      <ResultCard result={result} busy={!!busy} transportError={transportError} />
      <EventLog events={result?.events ?? []} busy={!!busy} />
      <SourceDebug result={result} schema={schema} />
    </Flex>
  );
}
