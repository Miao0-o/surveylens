import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { StoreHydrator } from "@/components/layout/store-hydrator";
import { InactivityGuard } from "@/components/layout/inactivity-guard";
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
  title: "SurveyLens | Survey Reliability & Validity Analyzer",
  description:
    "SurveyLens — 帮助研究者判断问卷数据是否准备好进入下一阶段分析。本地完成信度检验、效度分析、因子分析与稳定性评估，数据不出设备。",
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
        <InactivityGuard />
      </body>
    </html>
  );
}
