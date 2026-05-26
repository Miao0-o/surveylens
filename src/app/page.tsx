import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF9]">
      <header className="h-14 border-b border-border bg-card flex items-center px-6 shrink-0">
        <span className="text-sm font-semibold tracking-tight text-foreground">SurveyLens</span>
      </header>

      {/* HERO */}
      <section className="flex flex-col items-center text-center px-6 pt-20 pb-12 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold tracking-tight text-foreground mb-3 leading-snug">
          Know whether your questionnaire data<br />is ready for analysis.
        </h1>
        <p className="text-sm text-muted-foreground max-w-md mb-8 leading-relaxed">
          Upload survey data and evaluate reliability, validity, factor structure,
          and APA-ready results directly in your browser.
        </p>
        <Link
          href="/analyze"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Start Analysis
        </Link>
        <p className="text-xs text-muted-foreground/50 mt-4">
          No login required &middot; Local analysis &middot; Your data stays on your device
        </p>
      </section>

      {/* HOW IT WORKS */}
      <section className="px-6 pb-16 max-w-2xl mx-auto w-full">
        <div className="grid grid-cols-3 gap-6">
          {[
            { num: "1", title: "Upload CSV or Excel", desc: "Drag and drop your questionnaire data. Supports Likert-scale, text labels, and codebook mapping." },
            { num: "2", title: "Analyze reliability &amp; validity", desc: "Local engine computes Cronbach&apos;s &alpha;, KMO, Bartlett, EFA, and sample stability." },
            { num: "3", title: "AI interpretation + APA output", desc: "Evidence-traceable academic interpretation plus APA-7 formatted results." },
          ].map((s) => (
            <div key={s.num} className="flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center">
                <span className="text-sm font-semibold text-muted-foreground">{s.num}</span>
              </div>
              <p className="text-xs font-medium text-foreground">{s.title}</p>
              <p className="text-[11px] text-muted-foreground/70 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* EXAMPLE OUTPUT */}
      <section className="px-6 pb-20 max-w-2xl mx-auto w-full">
        <p className="text-sm font-semibold text-foreground text-center mb-8">What you get after uploading</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border p-4 bg-card border-border">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Reliability</p>
            <p className="text-sm font-semibold text-foreground mb-0.5">Cronbach&apos;s &alpha; = 0.87</p>
            <p className="text-xs font-medium text-emerald-600 mb-2">Internal consistency: Good</p>
            <p className="text-[11px] text-muted-foreground">Q5 flagged: low item-total correlation detected</p>
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
        <p className="text-[10px] text-muted-foreground/50 text-center mt-4">Example output &mdash; actual results depend on your data</p>
      </section>

      {/* WHY */}
      <section className="px-6 pb-20 max-w-2xl mx-auto w-full">
        <div className="grid grid-cols-3 gap-4">
          {[
            { title: "Local-first privacy", desc: "Data stays in your browser. No uploads, no servers, no tracking." },
            { title: "Research-ready outputs", desc: "APA-style interpretations and diagnostics for your paper." },
            { title: "Fast issue detection", desc: "Identify weak items and scale problems in minutes, not days." },
          ].map((c, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-1.5 p-4 rounded-xl bg-card border border-border/40">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <p className="text-xs font-medium text-foreground">{c.title}</p>
              <p className="text-[10px] text-muted-foreground/60 leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="flex flex-col items-center text-center px-6 pb-24">
        <p className="text-lg font-bold text-foreground mb-3">Start evaluating your survey data in minutes.</p>
        <Link
          href="/analyze"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Open Analyzer
        </Link>
        <p className="text-xs text-muted-foreground/50 mt-4">Works directly in your browser. No installation required.</p>
      </section>
    </div>
  );
}
