"use client";
import { DeleteOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button, Card, Popconfirm, Space, Table, Tag, Typography } from "antd";
import type { Task } from "./api";

type Props = {
  tasks: Task[];
  loading: boolean;
  disabled: boolean;
  onReload: () => void;
  onSeed: () => void;
  onReset: () => void;
};

// Dữ liệu nguồn mà MCP server đọc. Hiển thị để đối chiếu kết quả qua protocol với DB thật.
export default function TasksPanel({ tasks, loading, disabled, onReload, onSeed, onReset }: Props) {
  return (
    <Card size="small" title="Dữ liệu nguồn — SQLite scope mcp"
      extra={<Space>
        <Button size="small" icon={<ReloadOutlined />} loading={loading} disabled={disabled}
          onClick={onReload}>Đọc lại DB</Button>
        <Button size="small" icon={<PlusOutlined />} disabled={disabled} onClick={onSeed}>
          Seed 3 task
        </Button>
        <Popconfirm title="Xóa task của demo 07?"
          description="Chỉ xóa rows có demo_scope = mcp; Demo 04 không bị ảnh hưởng."
          okText="Xóa" cancelText="Thôi" onConfirm={onReset}>
          <Button size="small" danger icon={<DeleteOutlined />} disabled={disabled || !tasks.length}>
            Reset data
          </Button>
        </Popconfirm>
      </Space>}>
      <Table<Task> size="small" rowKey="id" dataSource={tasks} pagination={false}
        locale={{ emptyText: "Chưa có task. Bấm Seed 3 task để có dữ liệu cho tool đọc." }}
        columns={[
          { title: "id", dataIndex: "id", width: 70 },
          { title: "title", dataIndex: "title" },
          { title: "priority", dataIndex: "priority", width: 110,
            render: (priority: string) => <Tag>{priority}</Tag> },
          { title: "status", dataIndex: "status", width: 100 },
        ]} />
      <Typography.Text type="secondary">
        <Tag color="warning">seed dữ liệu</Tag> Nút Seed là Python ghi thẳng vào SQLite, không phải
        tool của MCP server (hai tool của server đều chỉ đọc).
      </Typography.Text>
    </Card>
  );
}
