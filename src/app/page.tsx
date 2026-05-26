import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF9]">
      <header className="h-14 border-b border-border bg-card flex items-center px-6 shrink-0">
        <span className="text-sm font-semibold tracking-tight text-foreground">SurveyLens</span>
      </header>

      <section className="flex flex-col items-center text-center px-6 pt-20 pb-12 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold tracking-tight text-foreground mb-3 leading-snug">
          Know whether your questionnaire data<br />is ready for analysis.
        </h1>
        <p className="text-sm text-muted-foreground max-w-md mb-8 leading-relaxed">
          Upload your survey data and instantly evaluate reliability, validity, factor structure,
          and APA-ready results — fully in your browser.
        </p>
        <Link
          href="/analyze"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Start Analysis
        </Link>
        <p className="text-xs text-muted-foreground/50 mt-4">
          No login required · Local analysis · Your data stays on your device
        </p>
      </section>

      <section className="px-6 pb-16 max-w-2xl mx-auto w-full">
        <div className="grid grid-cols-3 gap-6">
          {[
            { title: "Upload CSV or Excel", desc: "Drag and drop your questionnaire data. Supports Likert-scale, text labels, and codebook mapping.", icon: FileIcon },
            { title: "Analyze reliability & validity", desc: "Local engine computes Cronbach's α, KMO, Bartlett, EFA, and sample stability.", icon: ChartIcon },
            { title: "Get AI interpretation + APA output", desc: "Evidence-traceable academic interpretation plus APA-7 formatted results.", icon: SparkleIcon },
          ].map((s, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground">{s.icon}</div>
              <p className="text-xs font-medium text-foreground">{s.title}</p>
              <p className="text-[11px] text-muted-foreground/70 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 pb-20 max-w-2xl mx-auto w-full">
        <p className="text-sm font-semibold text-foreground text-center mb-8">What you get after uploading</p>
        <div className="grid grid-cols-2 gap-4">
          <OutputCard title="Reliability" highlight="Cronbach's α = 0.87" label="Internal consistency: Good" labelColor="text-emerald-600" notes={["Q5 flagged: low item-total correlation detected"]} />
          <OutputCard title="Validity" highlight="KMO = 0.82" label="Bartlett's test: significant" labelColor="text-emerald-600" notes={["Factor structure appears suitable for exploratory analysis"]} />
          <OutputCard title="AI Interpretation" notes={["The scale demonstrates acceptable internal consistency and appears appropriate for further statistical analysis."]} muted />
          <OutputCard title="APA Output" notes={["Cronbach's alpha indicated good internal consistency (α = .87)."]} muted />
        </div>
        <p className="text-[10px] text-muted-foreground/50 text-center mt-4">Example output — actual results depend on your data</p>
      </section>

      <section className="px-6 pb-20 max-w-2xl mx-auto w-full">
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: ShieldIcon, title: "Local-first privacy", desc: "Data stays in your browser. No uploads, no servers, no tracking." },
            { icon: FileIcon, title: "Research-ready outputs", desc: "APA-style interpretations and diagnostics you can use in your paper." },
            { icon: ZapIcon, title: "Fast issue detection", desc: "Identify weak items and scale problems in minutes, not days." },
          ].map((c, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-1.5 p-4 rounded-xl bg-card border border-border/40">
              <span className="text-muted-foreground">{c.icon}</span>
              <p className="text-xs font-medium text-foreground">{c.title}</p>
              <p className="text-[10px] text-muted-foreground/60 leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col items-center text-center px-6 pb-24">
        <p className="text-lg font-bold text-foreground mb-3">Start evaluating your survey data in minutes.</p>
        <Link href="/analyze" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity">
          Open Analyzer
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </Link>
        <p className="text-xs text-muted-foreground/50 mt-4">Works directly in your browser. No installation required.</p>
      </section>
    </div>
  );
}

function OutputCard({ title, highlight, label, labelColor, notes, muted }: {
  title: string; highlight?: string; label?: string; labelColor?: string; notes: string[]; muted?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 ${muted ? "bg-secondary/20 border-border/60" : "bg-card border-border"}`}>
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">{title}</p>
      {highlight && <p className="text-sm font-semibold text-foreground mb-0.5">{highlight}</p>}
      {label && <p className={`text-xs font-medium ${labelColor ?? ""} mb-2`}>{label}</p>}
      <div className="space-y-1">
        {notes.map((n, i) => (
          <p key={i} className={`text-[11px] leading-relaxed ${muted ? "text-muted-foreground/70" : "text-muted-foreground"}`}>{n}</p>
        ))}
      </div>
    </div>
  );
}

const FileIcon = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>;
const ChartIcon = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>;
const SparkleIcon = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/><path d="M20 2v4"/><path d="M22 4h-4"/><circle cx="4" cy="20" r="2"/></svg>;
const ShieldIcon = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>;
const ZapIcon = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>;
