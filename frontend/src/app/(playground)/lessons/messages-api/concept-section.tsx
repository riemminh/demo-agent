"use client";

import { Card, Collapse, Steps, Typography } from "antd";
import { CONCEPTS, FLOW_STEPS } from "./content";

// Đoạn nằm giữa hai dấu ` được hiển thị dạng code.
function withCode(text: string) {
  return text.split("`").map((part, i) =>
    i % 2 ? <Typography.Text code key={i}>{part}</Typography.Text> : part);
}

export default function ConceptSection() {
  return (
    <>
      <Card title="Concept — kiến thức cần hiểu" size="small">
        <Typography.Paragraph>
          Messages API là REST endpoint: gửi một JSON (model, system, messages, max_tokens),
          nhận một JSON Message. Không có streaming, không có vòng lặp, không có tool.
          Mở từng mục để xem các field xuất hiện trong Request/Response bên dưới.
        </Typography.Paragraph>
        <Collapse
          size="small"
          defaultActiveKey={["content"]}
          items={CONCEPTS.map((concept) => ({
            key: concept.key,
            label: <Typography.Text code>{concept.label}</Typography.Text>,
            children: <Typography.Paragraph style={{ margin: 0 }}>{withCode(concept.text)}</Typography.Paragraph>,
          }))}
        />
      </Card>
      <Card title="Execution Flow" size="small">
        {/* type="dot" + current cuối: chỉ minh họa thứ tự, không phải tiến độ của một run. */}
        <Steps type="dot" current={FLOW_STEPS.length - 1} items={FLOW_STEPS} />
        <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
          Browser không gọi Claude trực tiếp: API key chỉ nằm ở backend. Một lần Run = một HTTP
          request tới Claude (SDK retry bị tắt bằng max_retries=0).
        </Typography.Paragraph>
      </Card>
    </>
  );
}
