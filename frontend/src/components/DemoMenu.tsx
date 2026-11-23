"use client";

import { HomeOutlined } from "@ant-design/icons";
import { Menu } from "antd";
import type { MenuProps } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LIVE_DEMOS } from "@/lib/demos";

const HOME_ROUTE = "/workspace";

// Sidebar: Workspace Home + chỉ những demo đã chạy được. Demo chưa làm nằm ở Roadmap (Home).
// Dùng <Link> nên chuyển trang là client-side navigation: layout (Header + Sidebar) không unmount.
export default function DemoMenu() {
  const pathname = usePathname();

  const items: MenuProps["items"] = [
    { key: HOME_ROUTE, icon: <HomeOutlined />, label: <Link href={HOME_ROUTE}>Workspace Home</Link> },
    ...LIVE_DEMOS.map((demo) => ({
      key: demo.route,
      label: <Link href={demo.route}>{demo.id} · {demo.title}</Link>,
    })),
  ];

  return (
    <Menu
      mode="inline"
      selectedKeys={[pathname]}
      items={items}
      style={{ borderInlineEnd: 0, paddingTop: 8 }}
    />
  );
}
