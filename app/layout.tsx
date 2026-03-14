import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "个人投资看板",
  description: "个人投资看板，展示自选标的、宏观指标与技术信号。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
