import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Riff",
  description: "AI visual conversation assistant for music creation"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
