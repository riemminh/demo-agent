"use client";

import { Card, Empty, Spin, Tabs, Typography } from "antd";
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

  // Draft (kết quả chính) nằm ở DraftResult; Inspector chỉ để soi dữ liệu thô của cùng lần Run.
  return (
    <Card title="Inspect (tùy chọn)" size="small">
      <Tabs
        items={[
          { key: "request", label: "Request JSON", children: requestTab },
          { key: "response", label: "Response JSON", children: responseTab },
          { key: "trace", label: "Trace", children: runGate(() => <ExecutionTrace run={run!} />) },
          { key: "source", label: "Source & Debug", children: <SourceTab source={source} error={sourceError} /> },
        ]}
      />
    </Card>
  );
}
