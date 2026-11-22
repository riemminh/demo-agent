"use client";

import { CopyOutlined } from "@ant-design/icons";
import { App, Button, Card } from "antd";
import { MONO_FONT } from "@/theme/theme";

type Props = {
  title: React.ReactNode;
  code: string;
  lineNumbers?: boolean; // Bật cho source code để tìm đúng dòng đặt breakpoint.
};

// antd không có component code block, nên dùng <pre> monospace bên trong Card.
export default function CodeBlock({ title, code, lineNumbers = false }: Props) {
  const { message } = App.useApp();

  async function copy() {
    try {
      await navigator.clipboard.writeText(code); // Copy code gốc, không kèm số dòng.
      message.success("Đã copy");
    } catch {
      message.error("Trình duyệt không cho phép copy");
    }
  }

  const shown = lineNumbers
    ? code.split("\n").map((line, i) => `${String(i + 1).padStart(3)}  ${line}`).join("\n")
    : code;

  return (
    <Card size="small" title={title}
      extra={<Button size="small" icon={<CopyOutlined />} onClick={copy}>Copy</Button>}>
      <pre style={{
        margin: 0, fontFamily: MONO_FONT, fontSize: 13.5, lineHeight: 1.6,
        whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxHeight: 560, overflow: "auto",
      }}>
        {shown}
      </pre>
    </Card>
  );
}
