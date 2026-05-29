# SurveyLens QA & Logic Validation Matrix

## Quick Mode (Automatic)

| # | Scenario | Input | Expected | Status |
|---|----------|-------|----------|--------|
| Q1 | Upload CSV | 30-row Likert survey | Data preview + auto-classify Likert columns | ✅ |
| Q2 | Run analysis | No composites defined | Reliability on all Likert items, single global α | ✅ |
| Q3 | Metadata exclusion | CSV with RecipientEmail column | Metadata column NOT in analysis | ✅ |
| Q4 | Large multi-scale dataset | 200+ items, multiple constructs | Warning: "Multi-scale dataset detected — use Custom Mode" | ✅ |
| Q5 | Empty dataset | 0 rows | Error: "No data loaded" | ✅ |
| Q6 | Single column | 1 Likert column | Reliability N/A — need ≥ 2 items | ✅ |

## Custom Mode

| # | Scenario | Input | Expected | Status |
|---|----------|-------|----------|--------|
| C1 | Create composite | Select Q1,Q2,Q3 → "Anxiety (mean)" | Composite appears in variable list | ✅ |
| C2 | Per-scale reliability | 3 composites defined | Each composite gets own α, no global α | ✅ |
| C3 | Analysis scope lock | Define 2 composites, leave 50 cols unselected | Unselected columns NOT in results | ✅ |
| C4 | Validity tab visibility | ≥ 2 composites | Validity tab shows normally | ✅ |
| C5 | Validity tab disabled | 0-1 composites | Validity tab shows with 🔒, placeholder explanation | ✅ |
| C6 | Structure consistency | Composites + EFA results | Per-scale consistency % shown | ✅ |

## Reliability

| # | Scenario | Input | Expected | Status |
|---|----------|-------|----------|--------|
| R1 | High α scale | Simulated α ≈ .88 data | α displayed: .85-.92, labeled "Good" | ✅ |
| R2 | Low α scale | α < .60 data | Flagged as "Low" / "偏低" | ✅ |
| R3 | Per-scale α | Multi-composite analysis | Dimensions array filled, each with α | ✅ |
| R4 | Item-total correlation | Items with r < .20 | Flagged in diagnostics | ✅ |
| R5 | α-if-deleted | Removing item increases α by > .05 | Flagged in diagnostics | ✅ |
| R6 | Standardized α null | Computation fails | Shows "—" not "0.000" | ✅ |
| R7 | Omega null | EFA not run | Shows "—" not "0.000" | ✅ |
| R8 | Single scale mode | 1 scale, no composites | Simple α card shown (not multi-scale overview) | ✅ |

## Validity (Construct Relationships)

| # | Scenario | Input | Expected | Status |
|---|----------|-------|----------|--------|
| V1 | Correlation heatmap | ≥ 2 scale-level variables | Matrix displayed with color coding | ✅ |
| V2 | Strong relationship | r ≥ .50 pair | Shown in "Strong Relationships" | ✅ |
| V3 | Weak relationship | r < .30 pair | Shown in "Weak Relationships" | ✅ |
| V4 | Potential overlap | r ≥ .80 pair | Flagged: "may partially overlap" | ✅ |
| V5 | Potential redundancy | r ≥ .90 pair | Flagged: "may represent redundant measurements" | ✅ |
| V6 | No validity claims | No theoretical expectations | Does NOT say "convergent validity supported" | ✅ |
| V7 | Small sample caveat | N < 50 with high r | Note: "may reflect sampling fluctuation" | ✅ |

## Factor Analysis

| # | Scenario | Input | Expected | Status |
|---|----------|-------|----------|--------|
| F1 | KMO ≥ .80 | Well-correlated items | "Good" / "良好" | ✅ |
| F2 | KMO < .60 | Weakly correlated items | "Weak" / "较弱", warning flag | ✅ |
| F3 | Bartlett significant | p < .05 | "p < .001" or p value shown | ✅ |
| F4 | Bartlett not significant | p ≥ .05 | Warning: "may be identity matrix" | ✅ |
| F5 | EFA item-level | Multivariate data | Factor loadings on itemMatrix (not composites) | ✅ |
| F6 | Scree plot | EFA results | Eigenvalue chart rendered | ✅ |
| F7 | Many factors (Quick Mode) | > 10 factors, exploratory | Warning: "Likely multiple constructs — use Custom Mode" | ✅ |
| F8 | Structure consistency | Multi-scale with EFA | Per-scale consistency % + cross-loading items | ✅ |

## Stability (Bootstrap)

| # | Scenario | Input | Expected | Status |
|---|----------|-------|----------|--------|
| S1 | Normal bootstrap | N ≥ 50, decent α | α curve rendered, stability level shown | ✅ |
| S2 | Small N | N < 20 | Returns "not_applicable", stabilityLevel=null | ✅ |
| S3 | Unstable result | High variance in bootstrap | "unstable" shown, recommended N displayed | ✅ |
| S4 | Bootstrap unavailable | 1 item or 0 rows | Placeholder: "Stability Analysis Unavailable" | ✅ |
| S5 | Not unstable vs unavailable | null stabilityLevel | Does NOT label as "Unstable" — shows "Unavailable" | ✅ |

## Readiness

| # | Scenario | Input | Expected | Status |
|---|----------|-------|----------|--------|
| D1 | All gates pass | α ≥ .70 for 50%+, KMO ≥ .60, missing < 30% | READY | ✅ |
| D2 | Gate failure | Missing 35% | REVIEW REQUIRED (gate overrides score) | ✅ |
| D3 | Critical failure | KMO < .50 | NOT READY | ✅ |
| D4 | Score display | Any | Shows "Score / 100" with progress bar | ✅ |
| D5 | Primary reason | Gate failed | Shows which gate(s) failed | ✅ |
| D6 | Decision trace | Expandable section | Shows each gate pass/fail with severity | ✅ |
| D7 | Sample size warning | N < 100 | Shows stability note, does NOT fail gate | ✅ |

## Metadata Exclusion

| # | Scenario | Input | Expected | Status |
|---|----------|-------|----------|--------|
| M1 | Qualtrics fields | RecipientFirstName, IPAddress, etc. | Auto-classified as metadata, excluded | ✅ |
| M2 | Scope card | Metadata columns present | Shows count: "15 metadata columns filtered" | ✅ |
| M3 | Missing rate scoped | Metadata cols + scale items | Missing rate computed on analysis scope only | ✅ |

## Reverse Detection

| # | Scenario | Input | Expected | Status |
|---|----------|-------|----------|--------|
| X1 | Negative item-total | r < 0 | Flagged as possible reverse-coding | ✅ |
| X2 | Confirmation workflow | User checks reverse items | Checked items applied on re-run | ✅ |
| X3 | Codebook reverse | Codebook marks items as reverse | Auto-applied in mapping layer | ✅ |

## Missing Data

| # | Scenario | Input | Expected | Status |
|---|----------|-------|----------|--------|
| G1 | Missing rate | 30% NaN in scope | "30%" displayed, gate fails if ≥ 30% | ✅ |
| G2 | Imputation option | User selects mean imputation | Applied before composite aggregation | ✅ |
| G3 | Listwise option | User selects listwise | Complete cases only | ✅ |

## Edge Cases

| # | Scenario | Expected | Status |
|---|----------|----------|--------|
| E1 | All NaN column | Excluded from analysis | ✅ |
| E2 | Constant column (no variance) | α may be NaN → handled by Python guard | ✅ |
| E3 | 1 row | Preflight: "Insufficient rows" | ✅ |
| E4 | Hooks order | No "Rendered more hooks" error | ✅ |
| E5 | Tab switching | All tabs render without crash | ✅ |
| E6 | Language switch | All UI text changes, no mixed language | ✅ |

---

## Launch Validation Summary

### P0 — Logic Failures
*None identified.* All core logic paths verified.

### P1 — Interpretation Risks
- Quick Mode on large multi-scale datasets: warning now shown ✅
- Many-factor EFA in exploratory mode: safety note added ✅
- Stability: "not assessed" no longer labeled "unstable" ✅
- Validity: no longer hidden — always visible with explanation ✅

### P2 — Polish Issues
- Export formatting: clean HTML for Word paste ✅
- Copy buttons: fallback helper with execCommand ✅
- Readiness header: score/100 + progress bar ✅
- Trust indicators footer: added to overview ✅
- Methodology page: accessible from nav ✅
- Verification badge: internal + external status ✅

### Overall: Ready for Launch
