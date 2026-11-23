"use client";

import { Alert, Flex, Spin, Tag, Typography } from "antd";
import CodeBlock from "@/components/CodeBlock";

export type SourceFile = { path: string; code: string };

const { Text } = Typography;

// Số dòng tính từ comment "BREAKPOINT n" trong file thật, nên không lệch khi code thay đổi.
function lineAfter(code: string, marker: string): number | null {
  const index = code.split("\n").findIndex((line) => line.includes(marker));
  return index === -1 ? null : index + 2; // +1 vì 1-based, +1 vì code nằm ngay dưới comment.
}

export default function SourceTab({ source, error }: { source: SourceFile | null; error: string | null }) {
  if (error) return <Alert type="error" showIcon title="Không tải được source" description={error} />;
  if (!source) return <Spin description="Đang tải source…"><div style={{ height: 80 }} /></Spin>;

  const backendBreakpoints = [
    { marker: "BREAKPOINT 1", what: "request_body", why: "Xem chính xác body sẽ gửi Claude: model, max_tokens, messages, system." },
    { marker: "BREAKPOINT 2", what: "await client.messages.create(...)", why: "Step Over: đây là lúc request HTTP thật đi ra. Lỗi 401/404/429 nhảy vào except." },
    { marker: "BREAKPOINT 3", what: "answer = ...", why: "Inspect message.content (list block), message.stop_reason, message.usage." },
  ];

  return (
    <Flex vertical gap={12}>
      <div>
        <Typography.Title level={5}>Breakpoints</Typography.Title>
        <Flex vertical gap={6}>
          {backendBreakpoints.map((bp, i) => (
            <Text key={bp.marker}>
              <Tag color="red">BP{i + 1}</Tag>
              <Text code>{source.path}:{lineAfter(source.code, bp.marker) ?? "?"}</Text> <Text code>{bp.what}</Text> — {bp.why}
            </Text>
          ))}
          <Text>
            <Tag>Route</Tag><Text code>backend/playground_api.py</Text> → <Text code>post_messages_api()</Text> — body đã qua Pydantic; xem cách chọn HTTP status.
          </Text>
          <Text>
            <Tag>Frontend</Tag><Text code>claude-api/demo-form.tsx</Text> → <Text code>submit()</Text> — prompt được ghép từ 2 ô input bằng <Text code>PRESETS[key].buildPrompt</Text> (<Text code>content.ts</Text>).
          </Text>
          <Text>
            <Tag>Frontend</Tag><Text code>claude-api/page.tsx</Text> → <Text code>runDemo()</Text> — đặt breakpoint ở <Text code>await fetch(...)</Text> trong DevTools, đối chiếu tab Network.
          </Text>
        </Flex>
      </div>
      <CodeBlock title={<>Source đang chạy: <Text code>{source.path}</Text></>} code={source.code} lineNumbers />
    </Flex>
  );
}
