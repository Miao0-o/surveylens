"use client";

import Link from "next/link";
import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { ArrowLeft, Check, Copy, Loader2, Shield, Sparkles, Terminal, Zap } from "lucide-react";

export default function AISettingsPage() {
  const apiKey = useAppStore((s) => s.apiKey);
  const setApiKey = useAppStore((s) => s.setApiKey);
  const aiMode = useAppStore((s) => s.aiMode);
  const setAIMode = useAppStore((s) => s.setAIMode);

  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "fail" | null>(null);
  const [copied, setCopied] = useState(false);

  const startupCmd = "cd backend && python main.py";

  const handleCopyCmd = () => {
    navigator.clipboard.writeText(startupCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestConnection = async () => {
    if (!apiKey?.startsWith("sk-ant")) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("http://localhost:8000/api/health");
      if (res.ok) {
        setTestResult("success");
        setAIMode("connected");
      } else {
        setTestResult("fail");
        setAIMode("offline");
      }
    } catch {
      setTestResult("fail");
      setAIMode("offline");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      {/* Top bar */}
      <header className="h-14 border-b border-border bg-card flex items-center px-6 shrink-0 gap-4">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
          返回
        </Link>
        <span className="text-sm font-semibold text-foreground">AI 解读增强模式</span>
        {aiMode === "connected" && (
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            已连接
          </span>
        )}
        {aiMode === "offline" && (
          <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            未连接
          </span>
        )}
      </header>

      <main className="max-w-xl mx-auto px-6 py-12 space-y-8">
        {/* Intro */}
        <div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            AI 不参与统计计算。系统仅发送统计结果摘要（不含原始数据），
            用于生成学术解释与诊断建议。
          </p>
        </div>

        {/* Privacy */}
        <div className="rounded-xl bg-blue-50/40 border border-blue-100/50 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-500" strokeWidth={1.5} />
            <span className="text-sm font-medium text-blue-700">隐私说明</span>
          </div>
          <ul className="text-xs text-blue-600/80 space-y-1 ml-6">
            <li>原始问卷数据绝不会上传</li>
            <li>所有统计分析在浏览器本地完成</li>
            <li>AI 仅接收统计指标摘要（约 500 字符）</li>
            <li>API Key 仅存储在当前浏览器会话中</li>
          </ul>
        </div>

        {/* AI Features */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" strokeWidth={1.5} />
            <span className="text-sm font-medium text-foreground">AI 功能</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            {["统计指标自动解读", "低信度题项诊断", "因子结构建议", "量表优化建议", "反向题风险识别", "APA 论文结果生成"].map((f) => (
              <div key={f} className="flex items-center gap-1.5">
                <Check className="w-3 h-3 text-emerald-400" strokeWidth={2} />
                {f}
              </div>
            ))}
          </div>
        </div>

        <hr className="border-border" />

        {/* API Key */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">API Key</label>
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setTestResult(null);
              }}
              placeholder="sk-ant-api-..."
              className="w-full rounded-lg border border-border bg-card px-3 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground/40
                focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-colors font-mono"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            在 console.anthropic.com 获取 API Key
          </p>
        </div>

        {/* Startup command */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
            <span className="text-sm font-medium text-foreground">启动本地 AI 服务</span>
          </div>
          <p className="text-xs text-muted-foreground">
            在终端中运行以下命令以启动 AI 连接服务：
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-secondary/50 border border-border px-3.5 py-2.5 text-sm text-foreground font-mono">
              {startupCmd}
            </code>
            <button
              onClick={handleCopyCmd}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-border text-xs text-muted-foreground
                hover:text-foreground hover:bg-secondary/50 transition-colors"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" strokeWidth={2} />
              ) : (
                <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
              )}
              {copied ? "已复制" : "复制"}
            </button>
          </div>
        </div>

        {/* Test Connection */}
        <div className="space-y-3">
          <button
            onClick={handleTestConnection}
            disabled={!apiKey?.startsWith("sk-ant") || testing}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-foreground text-background text-sm font-medium
              hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
          >
            {testing ? (
              <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
            ) : (
              <Zap className="w-4 h-4" strokeWidth={1.5} />
            )}
            {testing ? "连接中..." : "测试连接"}
          </button>

          {testResult === "success" && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100 text-sm text-emerald-700">
              <Check className="w-4 h-4" strokeWidth={2} />
              AI 服务已连接
            </div>
          )}
          {testResult === "fail" && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100 text-sm text-amber-700">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div>
                <p className="font-medium">无法连接 AI 服务</p>
                <p className="text-xs text-amber-600/80 mt-0.5">
                  请确认已复制启动命令并在终端中运行。
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Go to analysis */}
        {aiMode === "connected" && (
          <Link
            href="/analyze"
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium
              hover:opacity-90 transition-opacity"
          >
            <Sparkles className="w-4 h-4" strokeWidth={1.5} />
            进入分析工作台
          </Link>
        )}
      </main>
    </div>
  );
}
