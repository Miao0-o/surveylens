<p align="center">
  <h1 align="center">SurveyLens</h1>
  <p align="center">Instant insight from survey data.<br/>Reliability, validity, factor analysis — all in your browser.</p>
</p>

<p align="center">
  <a href="https://miao0-o.github.io/surveylens/">Try it online</a>
  &nbsp;·&nbsp;
  <a href="#getting-started">Getting Started</a>
  &nbsp;·&nbsp;
  <a href="#privacy">Privacy</a>
</p>

---

## Why SurveyLens

Before you can run regressions or SEM, you need to know your scale works. Existing tools require installation, upload your data to a server, or leave you manually formatting APA tables. SurveyLens does all three in the browser — no install, no upload, instant results.

---

## Features

- **One-click reliability** — Cronbach's α, per-dimension diagnostics, item-total correlations
- **Validity & factor analysis** — KMO, Bartlett's test, EFA with scree plots and loading matrices
- **Codebook-aware mapping** — Drop in a codebook (CSV, XLSX, SPSS, PDF, Markdown) and SurveyLens auto-maps text responses
- **AI interpretation** — Evidence-traceable, research-oriented explanations with APA 7th edition output. Bilingual (EN/ZH)
- **Zero data upload** — All computation runs locally via WebAssembly. Your data never leaves your browser

---

## How it works

1. **Upload** your survey data (CSV, XLSX, SAV, DTA, or Qualtrics export)
2. **Analyze** — reliability, validity, and factor structure computed in your browser via Pyodide
3. **Export** — APA-ready results and AI interpretation, ready for your manuscript

---

## Privacy

SurveyLens is a fully static site. **No server, no database, no analytics.**

- Statistical engine runs in-browser (Python/NumPy/SciPy compiled to WebAssembly)
- AI receives only aggregated statistical summaries, never raw responses
- API keys stored in ephemeral session storage, auto-cleared after inactivity
- Bring your own API key — we never proxy your requests

---

## Getting started

```bash
git clone https://github.com/Miao0-o/surveylens.git
cd surveylens
npm install
npm run dev
```

No environment variables or API keys required. For AI interpretation, bring a key from OpenRouter, Anthropic, OpenAI, or DeepSeek.

---

## Deployment

Built as a static Next.js export. Deployed via GitHub Actions to GitHub Pages on every push to `main`.

---

## License

MIT © 2026
