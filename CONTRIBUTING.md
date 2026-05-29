# Contributing to SurveyLens

SurveyLens is an open-source psychometric analysis platform. Contributions are welcome.

## Getting Started

```bash
git clone https://github.com/Miao0-o/surveylens.git
cd surveylens
npm install
npm run dev
```

## Development

- **Framework**: Next.js 16 (App Router) with static export
- **Styling**: Tailwind CSS v4
- **State**: Zustand with sessionStorage persistence
- **Statistics**: Pyodide (Python/NumPy/SciPy in WebAssembly)
- **Charts**: Recharts

### Build

```bash
npm run build
```

### Architecture

Three-layer analysis pipeline:

```
rawMatrix → itemMatrix (cleaned, imputed) → scaleMatrix (composites)
```

- Reliability, KMO, Bartlett, EFA run on itemMatrix
- Correlation, construct validity run on scaleMatrix
- Readiness aggregates across all layers

## Code Style

- All user-facing text must be bilingual (`en ? "EN" : "中文"`)
- Hooks must be declared at component top level only
- Use SafePanel error boundary for result components
- Use inline SVG icons instead of raw HTML insertion

## Before Submitting

1. Run `npm run build` — no TypeScript errors
2. Check the QA matrix in `docs/qa-validation-matrix.md`
3. Test in both Quick Mode and Custom Mode
4. Test language toggle (中文 / EN)
5. Verify no hooks order violations (no conditional hooks)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
