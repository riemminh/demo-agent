import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agent SSE Demo",
  description: "FastAPI Queue SSE Next.js demo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}