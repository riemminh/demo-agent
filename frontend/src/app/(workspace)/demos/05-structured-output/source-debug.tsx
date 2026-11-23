"use client";
import { Collapse, Flex, Tabs, Tag, Typography, theme } from "antd";
import CodeBlock from "@/components/CodeBlock";
import type { DraftResult } from "./api";
import { BREAKPOINTS } from "./content";

const { Text } = Typography;

function withCode(text: string) {
  return text.split("`").map((part, index) => (index % 2 ? <Text code key={index}>{part}</Text> : part));
}

export default function SourceDebug({ result, schema }: {
  result: DraftResult | null;
  schema: Record<string, unknown> | null;
}) {
  const { token } = theme.useToken();
  return (
    <Collapse size="small" items={[{
      key: "debug",
      label: "Source & Debug — JSON Schema, response JSON và 4 breakpoint",
      children: (
        <Tabs size="small" items={[
          {
            key: "schema", label: "JSON Schema",
            children: <CodeBlock title="Schema SDK sinh từ Pydantic TaskDraft (gửi trong output_config.format)"
              code={schema ? JSON.stringify(schema, null, 2) : "// Chưa tải được schema."} />,
          },
          {
            key: "response", label: "Response JSON",
            children: <CodeBlock title="Message trả về (content là text chứa JSON đúng schema)"
              code={result?.response ? JSON.stringify(result.response, null, 2)
                : "// Chưa có response (Validate không gọi Claude)."} />,
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
