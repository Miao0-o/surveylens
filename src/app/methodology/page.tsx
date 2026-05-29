"use client";

import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { ArrowLeft, Shield, CheckCircle2 } from "lucide-react";
import { VerificationBadge } from "@/components/verification/verification-badge";

const T = {
  title: { zh: "方法论与可信度", en: "Methodology & Trust" },
  about: {
    zh: "SurveyLens 是一个心理测量分析平台，在浏览器中本地完成信度、效度、因子结构与稳定性的评估。所有分析基于可追溯的统计证据。",
    en: "SurveyLens is a psychometric analysis platform that evaluates reliability, validity, factor structure, and stability — locally in your browser. All analyses are grounded in traceable statistical evidence."
  },
  reliability: {
    zh: { alpha: "Cronbach's α 衡量题项间的内部一致性。引用: Cronbach (1951)。", itemTotal: "题总相关衡量题项与其所属量表的一致性。r < .20 可能提示题项存在问题。", alphaIfDel: "删除后 α 估计删除某题项后信度的变化。" },
    en: { alpha: "Cronbach's α measures internal consistency among items. Reference: Cronbach (1951).", itemTotal: "Item-total correlation measures alignment between an item and its scale. r < .20 may indicate problematic items.", alphaIfDel: "Alpha-if-deleted estimates how reliability changes if an item is removed." },
  },
  validity: {
    zh: { relationships: "构念间关系评估量表之间的关联。", thresholds: "|r| < .30 较弱 · .30–.50 中等 · ≥ .50 较强 · ≥ .80 潜在重叠 · ≥ .90 潜在冗余" },
    en: { relationships: "Construct relationships evaluate associations between scales.", thresholds: "|r| < .30 Weak · .30–.50 Moderate · ≥ .50 Strong · ≥ .80 Potential overlap · ≥ .90 Potential redundancy" },
  },
  factor: {
    zh: { kmo: "KMO 衡量因子分析的适用性。≥ .80 优秀 · ≥ .60 可接受 · < .60 较弱。引用: Kaiser (1974)。", bartlett: "Bartlett 检验评估变量间是否充分相关。要求 p < .05。", consistency: "结构一致性比较用户定义的量表与实测因子结构之间的一致性。" },
    en: { kmo: "KMO measures suitability for factor analysis. ≥ .80 Excellent · ≥ .60 Acceptable · < .60 Weak. Reference: Kaiser (1974).", bartlett: "Bartlett's test evaluates whether variables are sufficiently correlated. Requires p < .05.", consistency: "Structure consistency compares user-defined scales with observed factor structure." },
  },
  stability: {
    zh: { bootstrap: "Bootstrap 稳定性通过重复重抽样评估估计的稳健性。分为稳定、中等、不稳定三级。" },
    en: { bootstrap: "Bootstrap stability evaluates robustness across repeated resamples. Categorized as Stable, Moderate, or Unstable." },
  },
  readiness: {
    zh: "准备度综合信度、因子分析、结构一致性、缺失数据、样本量与稳定性，生成整体评估。分数不能覆盖未通过的质量门槛。",
    en: "Readiness combines reliability, factor analysis, structure consistency, missing data, sample size, and stability into an overall assessment. Score cannot override failed quality gates.",
  },
  verification: {
    zh: "分析引擎已通过内部验证。外部验证（对照 R psych、Jamovi、SPSS）待完成。",
    en: "Analysis engine has passed internal verification. External validation against R psych, Jamovi, and SPSS is pending.",
  },
  limitations: {
    zh: "SurveyLens 不替代理论判断、量表开发专业知识或领域知识。统计证据应结合理论解读。",
    en: "SurveyLens does not replace theoretical judgment, scale development expertise, or substantive domain knowledge. Statistical evidence should be interpreted alongside theory.",
  },
  version: { zh: "版本", en: "Version" },
  framework: { zh: "分析框架", en: "Analysis Framework" },
};

const METRICS = [
  { section: "Reliability", zh: "信度", en: "Reliability", items: ["Cronbach's α", "Item-total Correlation", "α-if-deleted"] },
  { section: "Validity", zh: "效度", en: "Validity", items: ["Construct Relationships", "Construct Overlap", "Construct Redundancy"] },
  { section: "Factor Analysis", zh: "因子分析", en: "Factor Analysis", items: ["KMO", "Bartlett's Test", "Structure Consistency", "EFA"] },
  { section: "Stability", zh: "稳定性", en: "Stability", items: ["Bootstrap Stability"] },
];

export default function MethodologyPage() {
  const lang = useAppStore((s) => s.reportLanguage);
  const en = lang === "en";

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <header className="h-14 border-b border-border bg-card flex items-center px-6 shrink-0 gap-4">
        <Link href="/analyze" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
          {en ? "Back" : "返回"}
        </Link>
        <span className="text-sm font-semibold text-foreground">{T.title[lang]}</span>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-8">
        {/* About */}
        <section>
          <p className="text-sm text-muted-foreground leading-relaxed">{T.about[lang]}</p>
        </section>

        {/* Reliability */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground border-b border-border/50 pb-2">
            {en ? "Reliability" : "信度分析"}
          </h2>
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>{en ? T.reliability.en.alpha : T.reliability.zh.alpha}</p>
            <p>{en ? T.reliability.en.itemTotal : T.reliability.zh.itemTotal}</p>
            <p>{en ? T.reliability.en.alphaIfDel : T.reliability.zh.alphaIfDel}</p>
          </div>
          <InterpretationTable en={en} title="Cronbach's α" rows={[
            [en ? "Excellent" : "优秀", "≥ .90"],
            [en ? "Good" : "良好", ".80–.89"],
            [en ? "Acceptable" : "可接受", ".70–.79"],
            [en ? "Questionable" : "存疑", ".60–.69"],
            [en ? "Poor" : "偏低", "< .60"],
          ]} />
        </section>

        {/* Validity */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground border-b border-border/50 pb-2">
            {en ? "Validity" : "效度分析"}
          </h2>
          <p className="text-xs text-muted-foreground">{en ? T.validity.en.relationships : T.validity.zh.relationships}</p>
          <p className="text-xs text-muted-foreground">{en ? T.validity.en.thresholds : T.validity.zh.thresholds}</p>
        </section>

        {/* Factor Analysis */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground border-b border-border/50 pb-2">
            {en ? "Factor Analysis" : "因子分析"}
          </h2>
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>{en ? T.factor.en.kmo : T.factor.zh.kmo}</p>
            <p>{en ? T.factor.en.bartlett : T.factor.zh.bartlett}</p>
            <p>{en ? T.factor.en.consistency : T.factor.zh.consistency}</p>
          </div>
        </section>

        {/* Stability */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground border-b border-border/50 pb-2">
            {en ? "Stability" : "稳定性"}
          </h2>
          <p className="text-xs text-muted-foreground">{en ? T.stability.en.bootstrap : T.stability.zh.bootstrap}</p>
        </section>

        {/* Readiness */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground border-b border-border/50 pb-2">
            {en ? "Readiness" : "准备度"}
          </h2>
          <p className="text-xs text-muted-foreground">{T.readiness[lang]}</p>
        </section>

        {/* Verification */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground border-b border-border/50 pb-2">
            {en ? "Verification" : "验证状态"}
          </h2>
          <VerificationBadge />
        </section>

        {/* Limitations */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground border-b border-border/50 pb-2">
            {en ? "Limitations" : "局限性"}
          </h2>
          <p className="text-xs text-muted-foreground">{T.limitations[lang]}</p>
        </section>

        {/* Version + Framework */}
        <section className="rounded-lg bg-card border border-border p-4 space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
            <span className="font-medium text-foreground">{T.version[lang]}: v1.0</span>
          </div>
          <p className="text-muted-foreground">
            {T.framework[lang]}: {METRICS.map(m => en ? m.en : m.zh).join(" · ")}
          </p>
        </section>
      </main>
    </div>
  );
}

function InterpretationTable({ en, title, rows }: { en: boolean; title: string; rows: [string, string][] }) {
  return (
    <div className="rounded-lg bg-secondary/20 border border-border/50 p-2.5">
      <p className="text-[10px] font-medium text-muted-foreground mb-1.5">{title}</p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
        {rows.map(([label, range], i) => (
          <div key={i} className="flex justify-between">
            <span className="text-foreground">{label}</span>
            <span className="text-muted-foreground/60">{range}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
