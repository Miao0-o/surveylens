# SurveyLens

**Is your questionnaire data ready for the next stage of analysis?** SurveyLens gives you the answer — with no setup, no data upload, and APA-ready output.

[Open Analyzer](https://miao0-o.github.io/surveylens/) · [Getting Started](#getting-started) · [License](#license)

---

## The problem

Before you can run regressions, SEM, or hypothesis tests, you need to know your scale actually works. Existing tools either require installation (SPSS, Jamovi), upload your data to a server, or leave you to manually format results for publication. SurveyLens solves all three.

---

## Features

### Core analysis
- **Reliability** — Cronbach's α, per-dimension consistency, item-total correlations, α-if-deleted diagnostics
- **Validity** — KMO measure, Bartlett's test of sphericity, sampling adequacy
- **Factor structure** — Exploratory Factor Analysis with scree plots and loading matrices
- **Sample stability** — Bootstrap confidence intervals, minimum sample size recommendations

### Data management
- **Codebook mapping** — Upload a codebook (CSV/XLSX/SPSS/PDF/Markdown) and SurveyLens automatically maps text responses to numeric values
- **Reverse-item detection** — Automatic flagging with confirmation workflow
- **Missing value handling** — Configurable strategies (listwise, mean imputation)

### AI interpretation
- **Evidence-traceable** — Every claim links back to a specific statistical result
- **Research-oriented** — Interpretation framed around your research questions, not generic templates
- **APA 7th edition** — Ready-to-copy results paragraphs
- **Bilingual** — Full Chinese and English support

### Privacy-first design
- All computation runs locally via WebAssembly. No data ever leaves your browser.
- API keys stored in sessionStorage only; auto-cleared after 15 minutes of inactivity.
- No accounts, no tracking, no backend.

---

## How it works

```
Upload data → Upload codebook (optional) → Automatic mapping → Run analysis → AI interpretation → APA output
```

Every step happens in your browser. The statistical engine (NumPy + SciPy) runs inside Pyodide, a Python runtime compiled to WebAssembly.

---

## Supported formats

| Category | Formats |
|----------|---------|
| Data files | CSV, XLSX, SAV (SPSS), DTA (Stata), Qualtrics exports |
| Codebooks | CSV, XLSX, SPSS syntax, PDF, Markdown |

---

## Tech stack

| Layer | Stack |
|-------|-------|
| Frontend | Next.js 16 (App Router) · TypeScript · Tailwind CSS |
| Visualization | Recharts |
| Statistics | Pyodide (WASM) · NumPy · SciPy |
| AI routing | Multi-provider (OpenRouter / Anthropic / OpenAI / DeepSeek) |
| Deployment | GitHub Pages · GitHub Actions · Static export |

---

## Getting started

```bash
git clone https://github.com/Miao0-o/surveylens.git
cd surveylens
npm install
npm run dev
```

Open `http://localhost:3000` — no API keys or environment variables required.

For AI interpretation, bring your own API key from any supported provider (OpenRouter, Anthropic, OpenAI, or DeepSeek).

---

## Privacy

SurveyLens is designed so that **you never have to trust us with your data:**

- Statistical computation runs entirely in your browser via Pyodide (Python → WebAssembly)
- AI interpretation receives only aggregated statistical summaries (~500 characters), never raw data
- API keys are stored in ephemeral session storage and wiped after inactivity
- The app is a fully static site — no server, no database, no analytics

---

## Use cases

- Pre-registered scale validation
- Pilot study instrument evaluation
- Thesis/dissertation measurement chapters
- Teaching psychometrics in graduate methods courses
- Quick diagnostic checks before submitting to a supervisor

---

## Screenshots

*[Screenshots placeholder — add analysis dashboard, codebook mapping, APA output]*

---

## License

MIT © 2026
