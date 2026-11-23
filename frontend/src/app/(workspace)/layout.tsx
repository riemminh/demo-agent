import { AntdRegistry } from "@ant-design/nextjs-registry";
import PlaygroundShell from "@/components/PlaygroundShell";
import Providers from "./providers";

// Route group (workspace): mọi demo (/workspace, /runtime, /claude-api, ...) nằm trong group này,
// nên dùng chung MỘT layout. Next.js App Router giữ layout khi điều hướng giữa các page con,
// chỉ render lại page -> Header + Sidebar không unmount, không bị mất khi chuyển menu.
// AntdRegistry gom CSS-in-JS của antd khi SSR và chèn vào HTML đầu tiên,
// nên trang không bị "nháy" thiếu style và không lệch hydration.
export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <AntdRegistry>
      <Providers>
        <PlaygroundShell>{children}</PlaygroundShell>
      </Providers>
    </AntdRegistry>
  );
}
