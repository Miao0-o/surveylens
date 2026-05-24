import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { StoreHydrator } from "@/components/layout/store-hydrator";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI信效度分析系统 | Reliability & Validity Analyzer",
  description:
    "完全本地运行的 AI 问卷信效度分析工具。上传 CSV/Excel/Qualtrics，自动完成信度分析、效度检验、因子分析、样本稳定性评估与 APA 格式结果生成。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-Hans"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <StoreHydrator>{children}</StoreHydrator>
      </body>
    </html>
  );
}
