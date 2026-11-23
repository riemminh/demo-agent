"use client";
import { DeleteOutlined, ReloadOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Descriptions, Popconfirm, Space, Tag, Typography } from "antd";
import CodeBlock from "@/components/CodeBlock";
import type { NoteFile } from "./api";

type Props = {
  note: NoteFile | null;
  loading: boolean;
  disabled: boolean; // Đang có run chạy: không cho đọc/xóa file giữa chừng.
  onRead: () => void;
  onReset: () => void;
};

// Read-back file sandbox: bằng chứng side effect chỉ xảy ra sau khi Approve.
export default function NoteFileCard({ note, loading, disabled, onRead, onReset }: Props) {
  return (
    <Card size="small" title="File sandbox (read-back từ disk)"
      extra={<Space>
        <Button size="small" icon={<ReloadOutlined />} loading={loading} disabled={disabled} onClick={onRead}>
          Đọc lại file
        </Button>
        <Popconfirm title="Xóa file approval-note.md?"
          description="Chỉ xóa file của demo 01, không ảnh hưởng demo khác." okText="Xóa" cancelText="Thôi"
          onConfirm={onReset}>
          <Button size="small" danger icon={<DeleteOutlined />} disabled={disabled || !note?.exists}>
            Reset file
          </Button>
        </Popconfirm>
      </Space>}>
      {note === null
        ? <Alert type="info" showIcon
            title="Chưa đọc file. Bấm Đọc lại file để backend stat + read file từ disk." />
        : <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Descriptions size="small" column={{ xs: 1, md: 2 }} bordered items={[
              { key: "path", label: "Path", children: <Typography.Text code>{note.path}</Typography.Text> },
              { key: "exists", label: "Tồn tại",
                children: note.exists ? <Tag color="success">có</Tag> : <Tag>không</Tag> },
              { key: "size", label: "Size", children: `${note.size_bytes} bytes` },
              { key: "modified", label: "Modified", children: note.modified_at ?? "—" },
            ]} />
            {note.exists
              ? <CodeBlock title="Nội dung file đọc từ disk" code={note.content ?? ""} />
              : <Alert type="warning" showIcon
                  title="File không tồn tại — đúng kỳ vọng nếu bạn vừa Reject, để timeout hoặc vừa Reset file." />}
          </Space>}
    </Card>
  );
}
