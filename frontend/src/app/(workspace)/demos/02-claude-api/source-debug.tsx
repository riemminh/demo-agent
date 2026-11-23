"use client";
import { Collapse, Flex, Tabs, Tag, Typography, theme } from "antd";
import CodeBlock from "@/components/CodeBlock";
import type { ClaudeResult } from "./api";
import { BREAKPOINTS } from "./content";

const { Text } = Typography;

// Đoạn nằm giữa hai dấu ` được hiển thị dạng code.
function withCode(text: string) {
  return text.split("`").map((part, index) => (index % 2 ? <Text code key={index}>{part}</Text> : part));
}

// Raw JSON + breakpoint: mặc định đóng, chỉ mở khi cần debug trên máy chiếu.
export default function SourceDebug({ result }: { result: ClaudeResult | null }) {
  const { token } = theme.useToken();
  return (
    <Collapse size="small" items={[{
      key: "debug",
      label: "Source & Debug — request/response JSON và 4 breakpoint",
      children: (
        <Tabs size="small" items={[
          {
            key: "request", label: "Request JSON",
            children: <CodeBlock title="Body gửi Claude (không chứa API key)"
              code={result?.request ? JSON.stringify(result.request, null, 2) : "// Chưa có request nào."} />,
          },
          {
            key: "response", label: "Response JSON",
            children: <CodeBlock title="Message mà API trả về"
              code={result?.response ? JSON.stringify(result.response, null, 2) : "// Chưa có response nào."} />,
          },
          {
            key: "breakpoints", label: "Breakpoints",
            children: (
              <Flex vertical gap={10}>
                {BREAKPOINTS.map((breakpoint, index) => (
                  <div key={breakpoint.code}>
                    <Tag color="red">BP{index + 1}</Tag>
                    <Text code>{breakpoint.file}</Text> → <Text code>{breakpoint.fn}</Text>
                    <pre style={{
                      margin: "6px 0", padding: "6px 10px", background: token.colorFillTertiary,
                      borderRadius: 6, whiteSpace: "pre-wrap", overflowWrap: "anywhere",
                    }}>{breakpoint.code}</pre>
                    <Text type="secondary">{withCode(breakpoint.why)}</Text>
                  </div>
                ))}
              </Flex>
            ),
          },
        ]} />
      ),
    }]} />
  );
}
