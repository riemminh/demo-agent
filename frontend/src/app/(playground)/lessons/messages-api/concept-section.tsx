"use client";

import { Collapse, Typography } from "antd";
import { CONCEPT } from "./content";

// Đoạn nằm giữa hai dấu ` được hiển thị dạng code.
function withCode(text: string) {
  return text.split("`").map((part, i) =>
    i % 2 ? <Typography.Text code key={i}>{part}</Typography.Text> : part);
}

// Concept là phần đọc thêm, mặc định đóng để không chắn phần chạy demo.
export default function ConceptSection() {
  return (
    <Collapse size="small" items={[{
      key: "how",
      label: "How it works — Messages API trong 3 câu",
      children: CONCEPT.map((text) => (
        <Typography.Paragraph key={text} style={{ marginBottom: 8 }}>{withCode(text)}</Typography.Paragraph>
      )),
    }]} />
  );
}
