"use client";
import { Card, Collapse, Flex, Tag, Typography, theme } from "antd";
import { BREAKPOINTS } from "./content";

const { Text } = Typography;

// Đoạn nằm giữa hai dấu ` được hiển thị dạng code.
function withCode(text: string) {
  return text.split("`").map((part, index) => (index % 2 ? <Text code key={index}>{part}</Text> : part));
}

// Breakpoint ghi bằng đoạn code có thật trong file: mở file, Ctrl+F đoạn code rồi đặt breakpoint.
export default function SourceDebug() {
  const { token } = theme.useToken();
  return (
    <Collapse size="small" items={[{
      key: "source",
      label: "Source & Debug — 5 điểm nên đặt breakpoint",
      children: (
        <Card size="small" variant="borderless" style={{ background: "transparent" }}>
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
        </Card>
      ),
    }]} />
  );
}
