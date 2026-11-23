import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Agent Demo Workspace",
  description: "8 interactive Claude Agent demos: FastAPI + Next.js + Ant Design",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // colorScheme dark: scrollbar, autofill và nền canvas của browser cũng tối, không lóe trắng khi overscroll.
    <html lang="vi" style={{ colorScheme: "dark" }}>
      <body style={{ margin: 0, background: "#000" }}>{children}</body>
    </html>
  );
}