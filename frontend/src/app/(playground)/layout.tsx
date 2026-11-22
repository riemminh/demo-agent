import { AntdRegistry } from "@ant-design/nextjs-registry";
import PlaygroundShell from "@/components/PlaygroundShell";
import Providers from "./providers";

// Route group (playground): áp dụng cho /playground và /lessons/* nhưng KHÔNG đổi URL.
// Demo legacy (/ và /approval) nằm ngoài group nên không bị antd ảnh hưởng.
// AntdRegistry gom CSS-in-JS của antd khi SSR và chèn vào HTML đầu tiên,
// nên trang không bị "nháy" thiếu style và không lệch hydration.
export default function PlaygroundLayout({ children }: { children: React.ReactNode }) {
  return (
    <AntdRegistry>
      <Providers>
        <PlaygroundShell>{children}</PlaygroundShell>
      </Providers>
    </AntdRegistry>
  );
}
