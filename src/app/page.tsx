import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF9]">
      <header className="h-14 border-b border-border bg-card flex items-center px-6 shrink-0">
        <span className="text-sm font-semibold tracking-tight text-foreground">SurveyLens</span>
      </header>

      <section className="flex flex-col items-center text-center px-6 pt-20 pb-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold tracking-tight text-foreground mb-3 leading-snug">
          Know whether your questionnaire data<br />is ready for analysis.
        </h1>
        <p className="text-sm text-muted-foreground max-w-md mb-2 leading-relaxed">
          Upload survey data and evaluate reliability, validity, factor structure,
          and APA-ready results directly in your browser.
        </p>
        <p className="text-xs text-muted-foreground/60 mb-6">
          We help you decide whether your survey data is ready for analysis.
        </p>
        <p className="text-sm text-muted-foreground/70 max-w-md mb-8 leading-relaxed">
          SurveyLens 在浏览器本地完成信度检验、效度分析、因子分析与稳定性评估，
          帮助研究者判断当前数据是否具备足够的统计质量以支持后续建模与学术报告。
          所有计算均在本地完成，数据不会离开您的设备。
        </p>
        <Link href="/analyze" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity">
          Open Analyzer
        </Link>
        <p className="text-xs text-muted-foreground/50 mt-4">
          No login required &middot; Local analysis &middot; Your data stays on your device
        </p>
      </section>

      <section className="px-6 pb-12 max-w-2xl mx-auto w-full">
        <div className="grid grid-cols-3 gap-4">
          {[
            { t: "本地计算", d: "基于 Pyodide (WASM) 引擎，数据全程不离开浏览器" },
            { t: "零数据上传", d: "问卷数据不上传服务器，保护受访者隐私" },
            { t: "APA 学术格式", d: "自动生成 APA 7 格式结果段落，可复制至论文" },
          ].map((f) => (
            <div key={f.t} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card border border-border/50">
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
              <p className="text-xs font-medium text-foreground">{f.t}</p>
              <p className="text-[10px] text-muted-foreground/60 leading-relaxed text-center">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 pb-12 max-w-2xl mx-auto w-full">
        <div className="grid grid-cols-2 gap-3 text-left">
          {[
            { t: "信度分析", i: ["Cronbach's α", "题总相关", "删除后 α 变化", "分维度信度"] },
            { t: "效度与因子", i: ["KMO + Bartlett 检验", "探索性因子分析 (EFA)", "碎石图 + 载荷矩阵", "样本稳定性评估"] },
            { t: "AI 学术解读", i: ["研究导向的结果解释", "谨慎的诊断建议", "证据可追溯", "中英双语"] },
            { t: "数据管理", i: ["编码簿映射", "反向题检测与确认", "缺失值处理", "维度分组管理"] },
          ].map((c) => (
            <div key={c.t} className="px-3 py-2.5 rounded-lg bg-secondary/20 border border-border/50">
              <p className="text-xs font-medium text-foreground mb-1">{c.t}</p>
              <ul className="text-[10px] text-muted-foreground space-y-0.5">
                {c.i.map((item) => (
                  <li key={item} className="flex items-center gap-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400 shrink-0"><polyline points="20 6 9 17 4 12" /></svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 pb-12 max-w-2xl mx-auto w-full">
        <p className="text-sm font-semibold text-foreground text-center mb-6">What you get after uploading</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border p-4 bg-card border-border">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Reliability</p>
            <p className="text-sm font-semibold text-foreground mb-0.5">Cronbach&apos;s &alpha; = 0.87</p>
            <p className="text-xs font-medium text-emerald-600 mb-2">Internal consistency: Good</p>
            <p className="text-[11px] text-muted-foreground">Q5 flagged: low item-total correlation</p>
          </div>
          <div className="rounded-xl border p-4 bg-card border-border">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Validity</p>
            <p className="text-sm font-semibold text-foreground mb-0.5">KMO = 0.82</p>
            <p className="text-xs font-medium text-emerald-600 mb-2">Bartlett&apos;s test: significant</p>
            <p className="text-[11px] text-muted-foreground">Suitable for exploratory factor analysis</p>
          </div>
          <div className="rounded-xl border p-4 bg-secondary/20 border-border/60">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">AI Interpretation</p>
            <p className="text-[11px] text-muted-foreground/70 leading-relaxed">The scale demonstrates acceptable internal consistency and appears appropriate for further statistical analysis.</p>
          </div>
          <div className="rounded-xl border p-4 bg-secondary/20 border-border/60">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">APA Output</p>
            <p className="text-[11px] text-muted-foreground/70 leading-relaxed">Cronbach&apos;s alpha indicated good internal consistency (&alpha; = .87).</p>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground/50 text-center mt-3">Example output &mdash; actual results depend on your data</p>
      </section>

      <section className="px-6 pb-12 max-w-2xl mx-auto w-full">
        <div className="grid grid-cols-3 gap-4">
          {[
            { t: "Local-first privacy", d: "Data stays in your browser. No uploads, no servers, no tracking." },
            { t: "Research-ready outputs", d: "APA-style interpretations and diagnostics for your paper." },
            { t: "Fast issue detection", d: "Identify weak items and scale problems in minutes." },
          ].map((c, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-1.5 p-4 rounded-xl bg-card border border-border/40">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <p className="text-xs font-medium text-foreground">{c.t}</p>
              <p className="text-[10px] text-muted-foreground/60 leading-relaxed">{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col items-center text-center px-6 pb-24">
        <p className="text-lg font-bold text-foreground mb-3">Start evaluating your survey data in minutes.</p>
        <Link href="/analyze" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity">
          Open Analyzer
        </Link>
        <p className="text-xs text-muted-foreground/50 mt-4">Works directly in your browser. No installation required.</p>
      </section>
    </div>
  );
}
