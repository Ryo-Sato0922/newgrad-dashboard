import type { Metadata } from "next";
import type React from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "新卒採用事業 Dashboard",
  description: "タイミー上の働く体験を起点にした新卒採用事業の検証ダッシュボード"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
