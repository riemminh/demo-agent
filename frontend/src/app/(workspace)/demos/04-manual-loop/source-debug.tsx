"use client";
import { Collapse, Flex, Tag, Typography, theme } from "antd";
import { BREAKPOINTS } from "./content";

const { Text } = Typography;

function withCode(text: string) {
  return text.split("`").map((part, index) => (index % 2 ? <Text code key={index}>{part}</Text> : part));
}

export default function SourceDebug() {
  const { token } = theme.useToken();
  return (
    <Collapse size="small" items={[{
      key: "source",
      label: "Source & Debug — breakpoint Rules · Skills · Permissions · Subagents",
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
          <Text type="secondary">
            SQLite: <Text code>backend/shared/task_store.py</Text> — <Text code>create_task()</Text> INSERT rồi đọc
            lại theo id; <Text code>reset_scope()</Text> chỉ xóa <Text code>demo_scope = manual_loop</Text>.
          </Text>
        </Flex>
      ),
    }]} />
  );
}
