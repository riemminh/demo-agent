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
    <html lang="vi">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}