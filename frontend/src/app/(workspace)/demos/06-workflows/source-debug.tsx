"use client";
import { Collapse, Flex, Tag, Typography, theme } from "antd";
import type { PatternName } from "./api";
import { PATTERNS } from "./content";

const { Text } = Typography;

function withCode(text: string) {
  return text.split("`").map((part, index) => (index % 2 ? <Text code key={index}>{part}</Text> : part));
}

// Chỉ hiện breakpoint của pattern đang chạy — không đổ cả patterns.py lên màn hình.
export default function SourceDebug({ pattern }: { pattern: PatternName }) {
  const { token } = theme.useToken();
  const current = PATTERNS[pattern];
  return (
    <Collapse size="small" items={[{
      key: "source",
      label: `Source & Debug — breakpoint của pattern ${current.label}`,
      children: (
        <Flex vertical gap={8}>
          <div>
            <Tag color="red">BP</Tag>
            <Text code>{current.breakpoint.file}</Text> → <Text code>{current.breakpoint.fn}</Text>
            <pre style={{
              margin: "6px 0", padding: "6px 10px", background: token.colorFillTertiary,
              borderRadius: 6, whiteSpace: "pre-wrap", overflowWrap: "anywhere",
            }}>{current.breakpoint.code}</pre>
            <Text type="secondary">{withCode(current.breakpoint.why)}</Text>
          </div>
          <Text type="secondary">
            Budget và trace nằm ở <Text code>backend/demos/demo_06_workflows/runner.py</Text> →{" "}
            <Text code>Trace.call()</Text>: nó đếm call, raise <Text code>BudgetExceeded</Text> khi vượt, và
            ghi <Text code>start_ms</Text>/<Text code>end_ms</Text> cho từng step.
          </Text>
        </Flex>
      ),
    }]} />
  );
}
