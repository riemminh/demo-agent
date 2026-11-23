"use client";
import { Collapse, Flex, Tabs, Tag, Typography, theme } from "antd";
import CodeBlock from "@/components/CodeBlock";
import type { ToolRunResult } from "./api";
import { BREAKPOINTS } from "./content";

const { Text } = Typography;

function withCode(text: string) {
  return text.split("`").map((part, index) => (index % 2 ? <Text code key={index}>{part}</Text> : part));
}

// Raw JSON của cả hai lần gọi + breakpoint. Mặc định đóng.
export default function SourceDebug({ result, toolSchemas }: {
  result: ToolRunResult | null;
  toolSchemas: Record<string, unknown>[];
}) {
  const { token } = theme.useToken();
  const requestTabs = (result?.requests ?? []).map((request, index) => ({
    key: `request-${index}`,
    label: `Request #${index + 1}`,
    children: <CodeBlock title={`Body gửi Claude lần ${index + 1}`} code={JSON.stringify(request, null, 2)} />,
  }));
  const responseTabs = (result?.responses ?? []).map((response, index) => ({
    key: `response-${index}`,
    label: `Response #${index + 1}`,
    children: <CodeBlock title={`Message trả về lần ${index + 1}`} code={JSON.stringify(response, null, 2)} />,
  }));
  return (
    <Collapse size="small" items={[{
      key: "debug",
      label: "Source & Debug — tool schema, request/response JSON và 4 breakpoint",
      children: (
        <Tabs size="small" items={[
          {
            key: "schema", label: "Tool schema",
            children: <CodeBlock title="tools[] gửi cho model (tools.py → TOOL_SCHEMAS)"
              code={JSON.stringify(toolSchemas, null, 2)} />,
          },
          ...requestTabs,
          ...responseTabs,
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
