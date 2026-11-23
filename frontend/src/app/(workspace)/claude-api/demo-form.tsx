"use client";

import { PlayCircleOutlined, ReloadOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Collapse, Form, Input, InputNumber, Segmented, Space, Typography } from "antd";
import { useState } from "react";
import type { Health } from "@/lib/api";
import { DEFAULT_MAX_TOKENS, PRESETS, type PresetKey } from "./content";
import type { DemoInput } from "./types";

type Props = {
  health: Health | null;
  healthError: string | null;
  running: boolean;
  onRun: (input: DemoInput) => void;
  onReset: () => void;
};

type FormValues = { title: string; details: string; system: string; max_tokens: number };

function presetValues(key: PresetKey): FormValues {
  const preset = PRESETS[key];
  return { title: preset.title, details: preset.details, system: preset.system, max_tokens: DEFAULT_MAX_TOKENS };
}

export default function DemoForm({ health, healthError, running, onRun, onReset }: Props) {
  const [form] = Form.useForm<FormValues>();
  const [presetKey, setPresetKey] = useState<PresetKey>("task");
  const preset = PRESETS[presetKey];
  const cap = health?.max_tokens_cap ?? 1024;

  function choosePreset(key: PresetKey) {
    setPresetKey(key);
    form.setFieldsValue(presetValues(key));
    onReset(); // Draft cũ thuộc preset khác, không để lẫn với input mới.
  }

  function submit(values: FormValues) {
    // Prompt là chuỗi ghép từ 2 ô input; backend nhận đúng {prompt, system, max_tokens}.
    onRun({ prompt: preset.buildPrompt(values.title.trim(), values.details.trim()),
      system: values.system, max_tokens: values.max_tokens });
  }

  return (
    <Card title="Input" size="small" style={{ height: "100%" }}>
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
          title="Chưa cấu hình Claude API — Live verification pending"
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
      <Segmented<PresetKey> block value={presetKey} onChange={choosePreset} disabled={running}
        style={{ marginBottom: 16 }}
        options={(Object.keys(PRESETS) as PresetKey[]).map((key) => ({ value: key, label: PRESETS[key].label }))} />
      <Form form={form} layout="vertical" initialValues={presetValues("task")} onFinish={submit} disabled={running}>
        <Form.Item name="title" label={preset.titleLabel}
          rules={[{ required: true, whitespace: true, message: `Nhập ${preset.titleLabel.toLowerCase()}` }]}>
          <Input maxLength={200} />
        </Form.Item>
        <Form.Item name="details" label={preset.detailsLabel}
          rules={[{ required: true, whitespace: true, message: `Nhập ${preset.detailsLabel.toLowerCase()}` }]}>
          {/* 200 + 3000 + phần chữ cố định của prompt vẫn dưới giới hạn 4000 ký tự của backend. */}
          <Input.TextArea autoSize={{ minRows: 4, maxRows: 10 }} showCount maxLength={3000} />
        </Form.Item>
        <Collapse size="small" style={{ marginBottom: 16 }} items={[{
          key: "advanced", label: "Tùy chọn nâng cao: system prompt, max_tokens, model",
          forceRender: true, // Field phải mount để Form submit được giá trị dù Collapse đóng.
          children: <>
            <Form.Item label="Model (read-only, đọc từ LLM_MODEL ở backend)">
              <Input value={health?.model ?? "chưa cấu hình"} disabled />
            </Form.Item>
            <Form.Item name="system" label="System prompt (để trống thì backend không gửi)">
              <Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} showCount maxLength={2000} />
            </Form.Item>
            <Form.Item name="max_tokens" label={`max_tokens (1–${cap}, trần đặt bởi LLM_MAX_TOKENS)`}
              rules={[{ required: true, message: "Nhập max_tokens" }]} style={{ marginBottom: 0 }}>
              <InputNumber min={1} max={cap} precision={0} />
            </Form.Item>
          </>,
        }]} />
        <Space wrap>
          <Button type="primary" size="large" htmlType="submit" icon={<PlayCircleOutlined />}
            loading={running} disabled={!health?.llm_configured}>
            {preset.runLabel}
          </Button>
          <Button size="large" icon={<ReloadOutlined />} onClick={() => choosePreset(presetKey)}>
            Reset
          </Button>
        </Space>
      </Form>
    </Card>
  );
}
