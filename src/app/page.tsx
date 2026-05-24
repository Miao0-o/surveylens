import Link from "next/link";
import { AIStatusLabel } from "@/components/layout/top-nav";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF9]">
      {/* Top bar */}
      <header className="h-14 border-b border-border bg-card flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-2.5">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
            <path d="M3 3v16a2 2 0 0 0 2 2h16" />
            <path d="M18 17V9" />
            <path d="M13 17V5" />
            <path d="M8 17v-3" />
          </svg>
          <span className="text-sm font-semibold tracking-tight text-foreground">
            AI 信效度分析系统
          </span>
        </div>
        <div className="flex items-center gap-3">
          <AIStatusLabel />
          <Link
            href="/settings/ai"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground rounded-lg px-2.5 py-1.5 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v2" /><path d="M12 20v2" /><path d="M4.93 4.93l1.41 1.41" />
              <path d="M17.66 17.66l1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" />
              <path d="M6.34 17.66l-1.41 1.41" /><path d="M19.07 4.93l-1.41 1.41" />
            </svg>
            AI 设置
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 max-w-2xl mx-auto text-center">
        {/* Gentle illustration */}
        <div className="mb-8">
          <Illustration />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-foreground mb-3">
          AI 信效度分析系统
        </h1>
        <p className="text-base text-muted-foreground mb-2">
          本地统计分析 + AI 学术解读
        </p>
        <p className="text-sm text-muted-foreground/70 max-w-md mb-8 leading-relaxed">
          上传问卷数据后，自动完成信度与效度分析。
          数据全程在浏览器本地运行，无需上传至任何服务器。
          AI 可辅助生成学术解释、诊断建议与 APA 格式结果。
        </p>

        {/* Value props */}
        <div className="flex items-center gap-6 mb-10 text-xs text-muted-foreground/60">
          <span className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            完全本地计算
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            零数据上传
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            APA 学术格式
          </span>
        </div>

        {/* CTA buttons */}
        <div className="flex items-center gap-3">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-foreground text-background text-sm font-medium
              hover:opacity-90 transition-opacity"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12" /><path d="m17 8-5-5-5 5" /><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            </svg>
            开始本地分析
          </Link>
          <Link
            href="/settings/ai"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground font-medium
              hover:bg-secondary/50 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" />
            </svg>
            启用 AI 解读
          </Link>
        </div>

        <p className="text-xs text-muted-foreground/50 mt-4">
          无需注册 · 免费使用 · MIT 开源
        </p>
      </main>
    </div>
  );
}

/** Minimal academic illustration — clipboard with chart */
function Illustration() {
  return (
    <svg width="120" height="90" viewBox="0 0 200 150" fill="none" className="mx-auto opacity-40">
      {/* Clipboard body */}
      <rect x="50" y="35" width="100" height="105" rx="6" stroke="currentColor" strokeWidth="1.5" className="text-foreground" />
      {/* Clip */}
      <rect x="75" y="20" width="50" height="20" rx="4" stroke="currentColor" strokeWidth="1.5" className="text-foreground" />
      {/* Bar chart on clipboard */}
      <rect x="68" y="70" width="14" height="45" rx="2" fill="currentColor" className="text-muted-foreground/40" />
      <rect x="88" y="55" width="14" height="60" rx="2" fill="currentColor" className="text-primary/40" />
      <rect x="108" y="80" width="14" height="35" rx="2" fill="currentColor" className="text-muted-foreground/40" />
      <rect x="128" y="60" width="14" height="55" rx="2" fill="currentColor" className="text-muted-foreground/40" />
      {/* Check mark */}
      <circle cx="155" cy="55" r="14" stroke="currentColor" strokeWidth="1.2" className="text-emerald-400/60" />
      <path d="M149 55 l4 4 8-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400/60" />
    </svg>
  );
}
