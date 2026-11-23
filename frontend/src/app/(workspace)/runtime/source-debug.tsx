"use client";

import { Card, Flex, Tag, Typography } from "antd";
import { BREAKPOINTS } from "./content";

const { Text } = Typography;

// Đoạn nằm giữa hai dấu ` được hiển thị dạng code.
function withCode(text: string) {
  return text.split("`").map((part, i) => (i % 2 ? <Text code key={i}>{part}</Text> : part));
}

// Breakpoint ghi bằng đoạn code có thật trong file: mở file, Ctrl+F đoạn code rồi đặt breakpoint.
export default function SourceDebug() {
  return (
    <Card size="small" title="Source Code & Breakpoints">
      <Flex vertical gap={10}>
        {BREAKPOINTS.map((bp, i) => (
          <div key={bp.code}>
            <Tag color="red">BP{i + 1}</Tag>
            <Text code>{bp.file}</Text> → <Text code>{bp.fn}</Text>
            <pre style={{ margin: "6px 0", padding: "6px 10px", background: "#F6F8FB", borderRadius: 6,
              whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{bp.code}</pre>
            <Text type="secondary">{withCode(bp.why)}</Text>
          </div>
        ))}
        <Text type="secondary">
          Frontend: <Text code>runtime-demo.tsx</Text> → <Text code>handleEvent()</Text> cập nhật state cho từng event;{" "}
          <Text code>decide()</Text> gọi <Text code>POST /approvals/&#123;id&#125;</Text>; <Text code>cancel()</Text> gọi{" "}
          <Text code>POST /cancel</Text>.
        </Text>
      </Flex>
    </Card>
  );
}
