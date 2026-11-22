"use client";

import { PlayCircleOutlined, ReloadOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Form, Input, InputNumber, Space, Typography } from "antd";
import type { Health } from "@/lib/api";
import { DEFAULT_INPUT } from "./content";
import type { DemoInput } from "./types";

type Props = {
  health: Health | null;
  healthError: string | null;
  running: boolean;
  onRun: (input: DemoInput) => void;
  onReset: () => void;
};

export default function DemoForm({ health, healthError, running, onRun, onReset }: Props) {
  const [form] = Form.useForm<DemoInput>();
  const cap = health?.max_tokens_cap ?? 1024;

  return (
    <Card title="Interactive Demo" size="small">
      {healthError && (
        <Alert type="error" showIcon style={{ marginBottom: 16 }}
          title="Không kết nối được backend"
          description={<>
            {healthError}. Chạy <Typography.Text code>cd backend && uv run uvicorn api:app --reload --port 9000</Typography.Text> rồi tải lại trang.
          </>}
        />
      )}
      {health && !health.llm_configured && (
        <Alert type="warning" showIcon style={{ marginBottom: 16 }}
          title="Chưa cấu hình Claude API — Live Verification Pending"
          description={
            <ol style={{ margin: 0, paddingInlineStart: 20 }}>
              <li>Tạo <Typography.Text code>backend/.env</Typography.Text> với <Typography.Text code>ANTHROPIC_API_KEY</Typography.Text> và <Typography.Text code>LLM_MODEL</Typography.Text> (xem README).</li>
              <li>Restart backend: uvicorn không tự đọc lại <Typography.Text code>.env</Typography.Text>.</li>
              <li>Tải lại trang. Đang thiếu: <Typography.Text strong>{health.missing_env.join(", ")}</Typography.Text>.</li>
              <li>Key chỉ nằm ở backend. Không dán key vào UI hay chat.</li>
            </ol>
          }
        />
      )}
      <Form form={form} layout="vertical" initialValues={DEFAULT_INPUT} onFinish={onRun} disabled={running}>
        <Form.Item label="Model (read-only, đọc từ LLM_MODEL ở backend)">
          <Input value={health?.model ?? "chưa cấu hình"} disabled />
        </Form.Item>
        <Form.Item name="system" label="System prompt (tùy chọn, để trống thì không gửi)">
          <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} showCount maxLength={2000} />
        </Form.Item>
        <Form.Item name="prompt" label="User message"
          rules={[{ required: true, whitespace: true, message: "Nhập prompt trước khi Run" }]}>
          <Input.TextArea autoSize={{ minRows: 3, maxRows: 8 }} showCount maxLength={4000} />
        </Form.Item>
        <Form.Item name="max_tokens" label={`max_tokens (1–${cap}, trần đặt bởi LLM_MAX_TOKENS)`}
          rules={[{ required: true, message: "Nhập max_tokens" }]}>
          <InputNumber min={1} max={cap} precision={0} />
        </Form.Item>
        <Space wrap>
          <Button type="primary" htmlType="submit" icon={<PlayCircleOutlined />}
            loading={running} disabled={!health?.llm_configured}>
            Run — gọi Claude 1 lần
          </Button>
          <Button icon={<ReloadOutlined />} onClick={() => { form.resetFields(); onReset(); }}>
            Reset
          </Button>
        </Space>
      </Form>
    </Card>
  );
}
