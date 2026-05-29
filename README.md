# SurveyLens

**Local-first psychometric analysis platform.** Reliability, validity, factor analysis, and APA-ready survey diagnostics — all in your browser.

[Live Demo](https://surveylens.org/) · [Methodology](docs/methodology.md) · [Privacy](docs/privacy.md)

---

## What is SurveyLens?

SurveyLens helps researchers evaluate whether questionnaire data is ready for statistical analysis. Upload your survey data and get instant reliability diagnostics, validity checks, factor exploration, and APA-ready interpretation — no install, no data upload, no backend.

### Two workflows

| Quick Mode | Custom Mode |
|------------|-------------|
| Upload and analyze immediately | Define scales, composites, and research design |
| Auto-detects Likert items | Per-scale reliability, validity, factor analysis |
| Metadata columns auto-excluded | Strict analysis scope — only your selected variables |
| Ideal for first-pass exploration | Ideal for publishing and scale validation |

---

## Features

### Analysis

- **Research Readiness Dashboard** — Overall dataset quality with quality gates and severity assessment
- **Reliability** — Cronbach's α, McDonald's ω, item-total correlations, α-if-deleted diagnostics
- **Construct Validity** — Scale-level correlation matrix, relationship interpretation, overlap detection
- **Factor Analysis** — KMO, Bartlett's test, EFA with scree plots and loading matrices, structure consistency
- **Statistical Stability** — Bootstrap reliability curves with recommended sample size estimation
- **Problematic Items** — Multi-source risk scanner with primary/secondary issues and suggested actions

### Workflow

- **Codebook-aware** — Auto-map text responses to numeric values (CSV, XLSX, SPSS, PDF, Markdown)
- **AI Executive Summary** — Evidence-traceable, bilingual (EN/ZH), evidence-grounded recommendations
- **Export** — PDF, APA, Markdown, Quarto, Excel — all publication-ready

### Trust

- **Local-first** — All computation runs in-browser via Pyodide (WebAssembly)
- **Zero data upload** — No server, no database, no tracking
- **Analysis scope lock** — Only user-selected variables enter analysis
- **Verification framework** — Internal checks + external validation against R psych, Jamovi, SPSS
- **Methodology center** — Transparent thresholds, formulas, and references

---

## Quick Start

```bash
git clone https://github.com/Miao0-o/surveylens.git
cd surveylens
npm install
npm run dev
```

No backend or API keys required. Core analysis works out of the box. AI interpretation is optional and supports OpenRouter, Anthropic, OpenAI, and DeepSeek.

---

## Privacy & AI Safety

- Data never leaves your browser — all statistics computed locally
- AI receives only aggregated statistical summaries (~500 characters), never raw responses
- API keys stored in ephemeral session storage, auto-cleared on inactivity
- AI uses cautious language ("may indicate", "could suggest"), never makes definitive causal claims

See [docs/privacy.md](docs/privacy.md) for details.

---

## Tech Stack

Next.js · TypeScript · Tailwind CSS · Pyodide (NumPy/SciPy) · Zustand · Recharts · Vercel · Cloudflare

---

## Screenshots

*[Screenshots placeholder — add readiness dashboard, reliability results, factor analysis, AI report]*

---

## Verification

SurveyLens results are validated against R psych package, Jamovi, and SPSS where applicable. See [docs/verification.md](docs/verification.md) and the in-app Verification Badge for current status.

---

## Roadmap

- Enhanced factor visualization
- Per-scale McDonald's omega
- CFA and SEM integration
- Multi-language UI support
- Collaborative sharing

---

## License

MIT
