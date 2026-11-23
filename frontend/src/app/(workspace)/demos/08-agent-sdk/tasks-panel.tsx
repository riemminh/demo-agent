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

// Read-back: task chỉ xuất hiện khi can_use_tool trả Allow và tool thật sự chạy.
export default function TasksPanel({ tasks, loading, disabled, onReload, onReset }: Props) {
  return (
    <Card size="small" title="Tasks trong SQLite (scope agent_sdk)"
      extra={<Space>
        <Button size="small" icon={<ReloadOutlined />} loading={loading} disabled={disabled}
          onClick={onReload}>Đọc lại DB</Button>
        <Popconfirm title="Xóa task của demo 08?"
          description="Chỉ xóa rows có demo_scope = agent_sdk; Demo 04 và 07 không bị ảnh hưởng."
          okText="Xóa" cancelText="Thôi" onConfirm={onReset}>
          <Button size="small" danger icon={<DeleteOutlined />} disabled={disabled || !tasks.length}>
            Reset data
          </Button>
        </Popconfirm>
      </Space>}>
      <Table<Task> size="small" rowKey="id" dataSource={tasks} pagination={false}
        locale={{ emptyText: "Chưa có task. Chạy scenario Permissions rồi Approve để agent ghi một task." }}
        columns={[
          { title: "id", dataIndex: "id", width: 70 },
          { title: "title", dataIndex: "title" },
          { title: "priority", dataIndex: "priority", width: 110,
            render: (priority: string) => <Tag>{priority}</Tag> },
          { title: "status", dataIndex: "status", width: 100 },
        ]} />
      <Typography.Text type="secondary">
        Reject ở bước permission thì bảng này không thay đổi — đó là bằng chứng Deny chặn thật.
      </Typography.Text>
    </Card>
  );
}
