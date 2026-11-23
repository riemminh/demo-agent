import { AntdRegistry } from "@ant-design/nextjs-registry";
import WorkspaceLayout from "@/components/WorkspaceLayout";
import Providers from "./providers";

// Route group (workspace): mọi page (/workspace, /demos/*) nằm trong group này nên dùng chung
// MỘT layout. Next.js App Router giữ layout khi điều hướng, chỉ render lại page
// -> Header + Sidebar không unmount khi chuyển menu.
// AntdRegistry gom CSS-in-JS của antd khi SSR và chèn vào HTML đầu tiên,
// nên trang không bị "nháy" thiếu style và không lệch hydration.
export default function WorkspaceRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    <AntdRegistry>
      <Providers>
        <WorkspaceLayout>{children}</WorkspaceLayout>
      </Providers>
    </AntdRegistry>
  );
}
