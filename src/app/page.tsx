"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

const T = {
  heroTitle: { zh: "您的问卷数据是否准备好进入下一阶段分析？", en: "Is your questionnaire data ready for the next stage of analysis?" },
  heroSub: { zh: "SurveyLens 让答案变得很简单。", en: "SurveyLens makes the answer simple." },
  heroDesc: { zh: "上传数据，即可在浏览器中自动评估信度、效度与因子结构，并生成 APA 就绪结果。", en: "Upload data and automatically evaluate reliability, validity, and factor structure — with APA-ready results — right in your browser." },
  heroNote: { zh: "本地运行 · 数据不会离开设备", en: "Runs locally · Your data never leaves your device" },
  cta: { zh: "开始分析", en: "Open Analyzer" },
  ctaSub: { zh: "无需注册 · 免费使用 · 数据全程本地运行", en: "No login required · Free to use · Your data stays on your device" },
  features: {
    zh: [
      { t: "本地计算", d: "基于 Pyodide (WASM) 引擎，数据全程不离开浏览器" },
      { t: "零数据上传", d: "问卷数据不上传服务器，保护受访者隐私" },
      { t: "APA 学术格式", d: "自动生成 APA 7 格式结果段落，可复制至论文" },
    ],
    en: [
      { t: "Local-first privacy", d: "Runs entirely in your browser via Pyodide (WASM). No data uploads." },
      { t: "Zero data upload", d: "Survey data stays on your device. No servers, no tracking." },
      { t: "APA-ready output", d: "Auto-generates APA 7th edition formatted results ready for publication." },
    ],
  },
  capabilities: {
    zh: [
      { t: "信度分析", i: ["Cronbach's α", "题总相关", "删除后 α 变化", "分维度信度"] },
      { t: "效度与因子", i: ["KMO + Bartlett 检验", "探索性因子分析 (EFA)", "碎石图 + 载荷矩阵", "样本稳定性评估"] },
      { t: "AI 学术解读", i: ["研究导向的结果解释", "谨慎的诊断建议", "证据可追溯", "中英双语"] },
      { t: "数据管理", i: ["编码簿映射", "反向题检测与确认", "缺失值处理", "维度分组管理"] },
    ],
    en: [
      { t: "Reliability", i: ["Cronbach's α", "Item-total correlation", "α if item deleted", "Per-dimension reliability"] },
      { t: "Validity & Factor", i: ["KMO + Bartlett test", "Exploratory Factor Analysis", "Scree plot + loadings", "Sample stability"] },
      { t: "AI Interpretation", i: ["Research-oriented explanation", "Cautious diagnostic suggestions", "Evidence-traceable", "Bilingual output"] },
      { t: "Data Management", i: ["Codebook mapping", "Reverse-item detection", "Missing value handling", "Dimension grouping"] },
    ],
  },
  exampleTitle: { zh: "上传后您将获得", en: "What you get after uploading" },
  exampleFooter: { zh: "示例输出 — 实际结果取决于您的数据", en: "Example output — actual results depend on your data" },
  whyTitle: { zh: "", en: "" },
  whyCards: {
    zh: [
      { t: "本地隐私优先", d: "数据留在您的浏览器中，不上传、不追踪。" },
      { t: "研究即用输出", d: "APA 风格解释与诊断，可直接用于论文。" },
      { t: "快速问题检测", d: "几分钟内识别弱题项和量表问题。" },
    ],
    en: [
      { t: "Local-first privacy", d: "Data stays in your browser. No uploads, no tracking." },
      { t: "Research-ready outputs", d: "APA-style interpretations and diagnostics for your paper." },
      { t: "Fast issue detection", d: "Identify weak items and scale problems in minutes." },
    ],
  },
  finalCta: { zh: "几分钟内开始评估您的问卷数据。", en: "Start evaluating your survey data in minutes." },
  finalSub: { zh: "直接在浏览器中运行，无需安装。", en: "Works directly in your browser. No installation required." },
};

const CheckIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400 shrink-0"><polyline points="20 6 9 17 4 12" /></svg>
);
const CheckCircle = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><polyline points="20 6 9 17 4 12" /></svg>
);

export default function Home() {
  const [lang, setLang] = useState<"zh" | "en">("zh");

  useEffect(() => {
    const navLang = navigator.language || "";
    setLang(navLang.startsWith("zh") ? "zh" : "en");
  }, []);

  const en = lang === "en";
  const feat = T.features[lang];
  const caps = T.capabilities[lang];
  const why = T.whyCards[lang];

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF9]">
      <header className="h-14 border-b border-border bg-card flex items-center justify-between px-6 shrink-0">
        <span className="text-sm font-semibold tracking-tight text-foreground">SurveyLens</span>
        <button onClick={() => setLang(lang === "zh" ? "en" : "zh")} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
          {lang === "zh" ? "EN" : "中"}
        </button>
      </header>

      <section className="flex flex-col items-center text-center px-6 pt-16 pb-10 max-w-2xl mx-auto">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground mb-3 leading-tight">{T.heroTitle[lang]}</h1>
        <p className="text-lg text-foreground/80 font-medium mb-4">{T.heroSub[lang]}</p>
        <p className="text-base text-muted-foreground max-w-lg mb-8 leading-relaxed">{T.heroDesc[lang]}</p>
        <Link href="/analyze" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity">
          {T.cta[lang]}
        </Link>
        <p className="text-xs text-muted-foreground/50 mt-5">{T.heroNote[lang]}</p>
      </section>

      <section className="px-6 pb-12 max-w-2xl mx-auto w-full">
        <div className="grid grid-cols-3 gap-4">
          {feat.map((f) => (
            <div key={f.t} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card border border-border/50">
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"><CheckCircle /></div>
              <p className="text-xs font-medium text-foreground">{f.t}</p>
              <p className="text-[10px] text-muted-foreground/60 leading-relaxed text-center">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 pb-12 max-w-2xl mx-auto w-full">
        <div className="grid grid-cols-2 gap-3 text-left">
          {caps.map((c) => (
            <div key={c.t} className="px-3 py-2.5 rounded-lg bg-secondary/20 border border-border/50">
              <p className="text-xs font-medium text-foreground mb-1">{c.t}</p>
              <ul className="text-[10px] text-muted-foreground space-y-0.5">
                {c.i.map((item) => (<li key={item} className="flex items-center gap-1"><CheckIcon />{item}</li>))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 pb-12 max-w-2xl mx-auto w-full">
        <p className="text-sm font-semibold text-foreground text-center mb-6">{T.exampleTitle[lang]}</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border p-4 bg-card border-border">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">{en ? "Reliability" : "信度"}</p>
            <p className="text-sm font-semibold text-foreground mb-0.5">{en ? "Cronbach's α = 0.87" : "Cronbach's α = 0.87"}</p>
            <p className="text-xs font-medium text-emerald-600 mb-2">{en ? "Internal consistency: Good" : "内部一致性：良好"}</p>
            <p className="text-[11px] text-muted-foreground">{en ? "Q5 flagged: low item-total correlation" : "Q5 标记：题总相关偏低"}</p>
          </div>
          <div className="rounded-xl border p-4 bg-card border-border">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">{en ? "Validity" : "效度"}</p>
            <p className="text-sm font-semibold text-foreground mb-0.5">KMO = 0.82</p>
            <p className="text-xs font-medium text-emerald-600 mb-2">{en ? "Bartlett's test: significant" : "Bartlett 检验：显著"}</p>
            <p className="text-[11px] text-muted-foreground">{en ? "Suitable for exploratory factor analysis" : "适合探索性因子分析"}</p>
          </div>
          <div className="rounded-xl border p-4 bg-secondary/20 border-border/60">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">{en ? "AI Interpretation" : "AI 解读"}</p>
            <p className="text-[11px] text-muted-foreground/70 leading-relaxed">{en ? "The scale demonstrates acceptable internal consistency and appears appropriate for further statistical analysis." : "量表展示了可接受的内部一致性，适合进一步统计分析。"}</p>
          </div>
          <div className="rounded-xl border p-4 bg-secondary/20 border-border/60">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">{en ? "APA Output" : "APA 输出"}</p>
            <p className="text-[11px] text-muted-foreground/70 leading-relaxed">{en ? "Cronbach's alpha indicated good internal consistency (α = .87)." : "Cronbach's alpha 表明内部一致性良好（α = .87）。"}</p>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground/50 text-center mt-3">{T.exampleFooter[lang]}</p>
      </section>

      <section className="px-6 pb-12 max-w-2xl mx-auto w-full">
        <div className="grid grid-cols-3 gap-4">
          {why.map((c, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-1.5 p-4 rounded-xl bg-card border border-border/40">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <p className="text-xs font-medium text-foreground">{c.t}</p>
              <p className="text-[10px] text-muted-foreground/60 leading-relaxed">{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col items-center text-center px-6 pb-24">
        <p className="text-lg font-bold text-foreground mb-3">{T.finalCta[lang]}</p>
        <Link href="/analyze" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity">
          {T.cta[lang]}
        </Link>
        <p className="text-xs text-muted-foreground/50 mt-4">{T.finalSub[lang]}</p>
      </section>
    </div>
  );
}
