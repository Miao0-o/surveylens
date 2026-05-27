# Surveylens

Browser-based survey data analysis — reliability, validity, factor structure — fully local-first and privacy-preserving.

## Live Demo

**[surveylens.org](https://surveylens.org/)**

---

## Overview

Surveylens helps researchers evaluate whether survey data is ready for the next stage of analysis. Reliability diagnostics, validity checks, factor exploration, and APA-ready interpretation — all in the browser, with no install and no data upload.

---

## Features

- **Reliability analysis** — Cronbach's alpha, item-total correlations, per-dimension diagnostics
- **Validity diagnostics** — KMO measure, Bartlett's test, sampling adequacy
- **Factor exploration** — EFA with scree plots and loading matrices
- **APA-ready output** — Statistical summaries formatted for publication
- **Codebook-aware** — Auto-map text responses to numeric values
- **Local-first** — No server, no data upload, no tracking
- **AI interpretation** — Optional, evidence-traceable, bilingual (EN/ZH)

---

## Supported Formats

| Data Files | Codebooks |
|------------|-----------|
| CSV, XLSX, SPSS (.sav), DTA, Qualtrics | CSV, XLSX, SPSS, PDF, Markdown |

---

## How It Works

1. **Upload** survey data and optionally a codebook
2. **Run** reliability, validity, and factor diagnostics
3. **Review** results with APA-ready summaries
4. **Export** for your manuscript

---

## Privacy

Surveylens is fully local-first. All statistical computation runs directly in your browser via WebAssembly — no dataset is uploaded, stored, or transmitted. AI interpretation is opt-in and sends only aggregated statistical summaries, never raw responses.

---

## Getting Started

```bash
git clone https://github.com/Miao0-o/surveylens.git
cd surveylens
npm install
npm run dev
```

No backend required. Core analysis works out of the box.

AI interpretation is optional and supports **OpenRouter**, **Anthropic**, **OpenAI**, and **DeepSeek**.

---

## Tech Stack

Next.js · TypeScript · Tailwind CSS · GitHub Pages · GitHub Actions

---

## Use Cases

Psychology research · Social science surveys · Scale validation · Thesis analysis · Questionnaire diagnostics

---

## Roadmap

- Expanded psychometric diagnostics
- Improved factor visualization
- Enhanced APA export workflows
- Additional local AI tooling

---

## License

MIT
