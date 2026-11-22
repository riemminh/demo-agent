"use client";

import { Alert, Card, Empty, Result, Spin, Tabs, Tag, Typography } from "antd";
import CodeBlock from "@/components/CodeBlock";
import ExecutionTrace from "./execution-trace";
import SourceTab, { type SourceFile } from "./source-tab";
import type { RunRecord } from "./types";

type Props = {
  run: RunRecord | null;
  running: boolean;
  source: SourceFile | null;
  sourceError: string | null;
};

const json = (value: unknown) => JSON.stringify(value, null, 2);

export default function InspectorTabs({ run, running, source, sourceError }: Props) {
  const result = run?.result ?? null;

  // Chung cho các tab phụ thuộc vào một lần Run: loading / chưa chạy.
  function runGate(content: () => React.ReactNode) {
    if (running) return <Spin description="Đang chờ Claude trả lời…"><div style={{ height: 120 }} /></Spin>;
    if (!run) return <Empty description="Chưa chạy demo. Bấm Run để gửi request thật." />;
    return content();
  }

  const requestTab = runGate(() => result?.request
    ? <>
        <Typography.Paragraph type="secondary">
          Đúng dict truyền vào <Typography.Text code>client.messages.create(**request_body)</Typography.Text>.
          SDK tự thêm header <Typography.Text code>x-api-key</Typography.Text> ở backend; header đó không bao giờ được trả về UI.
        </Typography.Paragraph>
        <CodeBlock title="Request body gửi Claude" code={json(result.request)} />
      </>
    : <Empty description={result?.error?.message ?? run?.clientError ?? "Không có request nào được gửi tới Claude."} />);

  const responseTab = runGate(() => {
    if (result?.response) return <CodeBlock title="Message object Claude trả về" code={json(result.response)} />;
    if (result?.error) return <CodeBlock title="Lỗi thực tế (không có Message)" code={json(result.error)} />;
    return <Empty description={run?.clientError ?? "Không có response."} />;
  });

  const resultTab = runGate(() => {
    if (!result?.response) {
      return <Result status="error" title="Không có kết quả"
        subTitle={result?.error?.message ?? run?.clientError} />;
    }
    const truncated = result.response.stop_reason === "max_tokens";
    return (
      <>
        {truncated && <Alert type="warning" showIcon style={{ marginBottom: 12 }}
          title="stop_reason = max_tokens: output bị cắt, email chưa hoàn chỉnh" />}
        <Tag color="blue" style={{ marginBottom: 12 }}>Email draft: text do Claude sinh, chưa được gửi đi</Tag>
        <Card size="small">
          {result.answer
            ? <Typography.Paragraph style={{ whiteSpace: "pre-wrap", margin: 0 }}>{result.answer}</Typography.Paragraph>
            : <Empty description="Response không có content block type text." />}
        </Card>
      </>
    );
  });

  return (
    <Card title="Inspector" size="small">
      <Tabs
        items={[
          { key: "request", label: "Request", children: requestTab },
          { key: "response", label: "Response", children: responseTab },
          { key: "trace", label: "Execution Trace", children: runGate(() => <ExecutionTrace run={run!} />) },
          { key: "result", label: "Actual Result", children: resultTab },
          { key: "source", label: "Source Code", children: <SourceTab source={source} error={sourceError} /> },
        ]}
      />
    </Card>
  );
}
