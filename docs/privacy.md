# Privacy & Security

SurveyLens is designed so that you never have to trust us with your data.

## Data Processing

- **All statistical computation runs locally** in your browser via Pyodide (Python/NumPy/SciPy compiled to WebAssembly)
- **No survey data is uploaded** to any server — not even anonymized or aggregated
- **No backend exists** — SurveyLens is a fully static site with no database, no API server, no analytics

## AI Interpretation

- AI interpretation is **opt-in** — you must provide your own API key to enable it
- AI receives **only aggregated statistical summaries** (~500 characters), never raw survey responses
- API requests are made **directly from your browser** to the LLM provider — SurveyLens never proxies or logs your requests

## API Key Storage

- API keys are stored in **ephemeral sessionStorage**
- Automatically **cleared after 15 minutes** of inactivity
- Never written to localStorage, IndexedDB, or cookies
- **Never transmitted** to SurveyLens servers (none exist)

## Inactivity Protection

If no user activity is detected for 15 minutes, all analysis data is automatically cleared from browser memory. A 60-second countdown modal warns before clearing.

## No Tracking

SurveyLens does not use cookies, analytics, fingerprinting, or any form of user tracking. The only outbound network requests are:

1. Loading Pyodide and statistical packages from CDN (on first analysis run)
2. AI API calls (only if you provide a key and initiate interpretation)

## Data Export

When you export results (PDF, APA, Markdown, Excel, Quarto), the export file is generated entirely in your browser and downloaded directly. No data is sent to any server during export.

## Limitations

As with any browser-based application, data is held in memory during your session. For highly sensitive data, we recommend:

- Using a private/incognito browser window
- Closing the browser tab after your session
- Not sharing your screen while data is visible
