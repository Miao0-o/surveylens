# v1.0.0-beta — Public Beta Release

SurveyLens is a local-first psychometric analysis platform for survey and scale evaluation. Browser-based, privacy-first, no mandatory account, AI optional, APA-ready output.

---

## Highlights

### Research Readiness Dashboard
Overall dataset quality assessment with severity-weighted quality gates (reliability, factor analysis, structure consistency, missing data, sample size). Score cannot override failed gates.

### Reliability Analysis
Per-scale Cronbach's α with standardized α and McDonald's ω. Item-total correlations and α-if-deleted diagnostics with expandable per-scale cards in multi-scale mode.

### Validity Analysis
Scale-level correlation matrix with automatic relationship interpretation (strong, moderate, weak), construct overlap detection (|r| ≥ .80), and potential redundancy flags (|r| ≥ .90).

### Factor Analysis
KMO and Bartlett's test of sphericity, exploratory factor analysis with varimax rotation, scree plots, loading matrices, and structure consistency checking against user-defined scales.

### Statistical Stability
Bootstrap reliability curves (200 resamples) with stability level classification and recommended sample size estimation at the elbow point.

### Problematic Item Detection
Multi-source risk scanner aggregating five risk signals: low item-total correlation, alpha-if-deleted improvement, cross-loading, high missing rate, and reverse-coding patterns. Each item receives a primary issue, secondary issues, and a suggested action.

### Metadata Exclusion
Automatic filtering of common Qualtrics and survey platform metadata columns (RecipientFirstName, IPAddress, StartDate, etc.). Analysis scope lock ensures only user-selected variables enter analysis.

### Reverse Item Detection
Negative item-total correlation detection with visual confirmation workflow. Codebook-marked reverse items automatically transformed in the mapping layer.

### Missing Data Diagnostics
Configurable missing data strategies (listwise deletion, mean imputation) with column-level rate visualization and readiness gate integration.

### AI Interpretation
Evidence-traceable AI Executive Summary with finding → evidence → interpretation → action → confidence structure. Multi-provider support (OpenRouter, Anthropic, OpenAI, DeepSeek). Bilingual output.

### Bilingual Interface
Full Chinese and English support with session-persistent language preference. 100% of core analysis UI uses localized text.

---

## Export System

| Format | Description |
|--------|-------------|
| PDF Report | Clean print layout via browser print dialog |
| APA Results | Manuscript-style flowing paragraphs, copy-friendly |
| Markdown Report | Numbered sections, tables, methodology footer |
| Quarto Report | .qmd with YAML header, render-ready |
| Excel Workbook | Multi-sheet with summary, reliability, validity, factor analysis, stability |
| Clipboard Copy | Clean HTML for Word/Docs paste, no card styling |

---

## Privacy & Security

- **Local-first processing** — all statistical computation runs in-browser via Pyodide (NumPy/SciPy compiled to WebAssembly)
- **No automatic data upload** — survey data never leaves the browser
- **User-owned API keys** — stored in ephemeral sessionStorage, auto-cleared after 15 minutes inactivity
- **No tracking** — no cookies, no analytics, no fingerprinting

---

## Verification

- Internal verification framework with 5 reference datasets
- Self-check engine: reliability, reverse detection, missing rate, numerical stability
- QA validation matrix: 50+ test scenarios across 12 modules (docs/qa-validation-matrix.md)
- Verification badge system displayed in AI Settings
- External validation against R psych, Jamovi, and SPSS pending

---

## Documentation

- [README.md](README.md) — Product overview, features, quick start
- [Methodology Center](docs/methodology.md) — Formulas, thresholds, references
- [Privacy Documentation](docs/privacy.md) — Data handling, AI safety, key storage
- [Verification Documentation](docs/verification.md) — Internal checks, external validation framework
- [Contributing Guide](CONTRIBUTING.md) — Development setup, architecture, code style
- [QA Validation Matrix](docs/qa-validation-matrix.md) — 50+ test scenarios
- [CHANGELOG.md](CHANGELOG.md) — Full release history

---

## Known Limitations

- Exploratory factor analysis currently emphasizes exploratory diagnostics; confirmatory factor analysis is not yet available
- External statistical validation against R psych, Jamovi, and SPSS remains in progress — reference values are pending
- AI interpretation is advisory and does not replace theoretical judgement — all recommendations should be reviewed by qualified researchers
- McDonald's omega is computed globally from EFA results; per-scale omega requires future implementation
- Bootstrap stability currently bootstraps Cronbach's α only; multi-statistic bootstrap is planned

---

## Roadmap

- AI Interpretation 2.0 with research consultant persona
- Per-scale McDonald's omega
- Real dataset validation against published scale norms
- Public user testing and feedback integration
- Additional export formats
- Confirmatory factor analysis (CFA) integration

---

## Feedback

This is a public beta. We welcome feedback, bug reports, and feature requests.

- [Open a GitHub Issue](https://github.com/Miao0-o/surveylens/issues)
- [Start a Discussion](https://github.com/Miao0-o/surveylens/discussions)

---

**Live Demo:** [surveylens.org](https://surveylens.org/)
