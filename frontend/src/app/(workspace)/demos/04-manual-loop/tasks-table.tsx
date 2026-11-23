"use client";
import { DeleteOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button, Card, Popconfirm, Space, Table, Tag, Typography } from "antd";
import type { Task } from "./api";

type Props = {
  tasks: Task[];
  loading: boolean;
  disabled: boolean;
  onReload: () => void;
  onReset: () => void;
};

const PRIORITY_COLOR: Record<string, string> = { high: "red", medium: "orange", low: "default" };

// Bảng đọc trực tiếp từ SQLite (scope manual_loop) — không phải state trong RAM.
export default function TasksTable({ tasks, loading, disabled, onReload, onReset }: Props) {
  return (
    <Card size="small" title="Tasks trong SQLite (scope manual_loop)"
      extra={<Space>
        <Button size="small" icon={<ReloadOutlined />} loading={loading} disabled={disabled} onClick={onReload}>
          Đọc lại DB
        </Button>
        <Popconfirm title="Xóa toàn bộ task của demo 04?"
          description="Chỉ xóa rows có demo_scope = manual_loop; demo khác không bị ảnh hưởng."
          okText="Xóa" cancelText="Thôi" onConfirm={onReset}>
          <Button size="small" danger icon={<DeleteOutlined />} disabled={disabled || tasks.length === 0}>
            Reset data
          </Button>
        </Popconfirm>
      </Space>}>
      <Table<Task> size="small" rowKey="id" dataSource={tasks} pagination={false}
        locale={{ emptyText: "Chưa có task nào trong scope này." }}
        columns={[
          { title: "id", dataIndex: "id", width: 70 },
          { title: "title", dataIndex: "title" },
          { title: "priority", dataIndex: "priority", width: 110,
            render: (priority: string) => <Tag color={PRIORITY_COLOR[priority] ?? "default"}>{priority}</Tag> },
          { title: "status", dataIndex: "status", width: 100 },
        ]} />
      <Typography.Text type="secondary">
        File DB: <Typography.Text code>backend/data/tasks.sqlite3</Typography.Text> (gitignored).
        Mỗi demo ghi dưới demo_scope riêng.
      </Typography.Text>
    </Card>
  );
}
