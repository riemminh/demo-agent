"use client";

import { App, ConfigProvider } from "antd";
import { playgroundTheme } from "@/theme/theme";

// ConfigProvider là client component nên tách khỏi layout.tsx (server component).
// <App> cung cấp context cho message/notification dùng qua App.useApp().
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider theme={playgroundTheme}>
      <App>{children}</App>
    </ConfigProvider>
  );
}
