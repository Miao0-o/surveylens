# Statistical Verification

SurveyLens analysis results are validated against established psychometric software.

## Internal Verification

The analysis engine includes a self-check framework that validates against reference datasets:

| Dataset | Purpose | Status |
|---------|---------|--------|
| High-reliability scale | Cronbach's α estimation | ✅ Passed |
| Reverse-scored items | Reverse-item detection | ✅ Passed |
| High-missing dataset | Missing rate calculation | ✅ Passed |
| Small-N dataset | Small-sample robustness | ✅ Passed |
| Numerical stability | No NaN/Infinity output | ✅ Passed |

All internal checks run on every build and can be re-run from the in-app Verification Badge (AI Settings page).

## External Validation (Pending)

Reference values from external implementations are pending. The verification framework is prepared for:

- **R psych package** (`psych::alpha()`, `psych::KMO()`, `psych::fa()`)
- **Jamovi** (Reliability and Factor Analysis modules)
- **SPSS** (Reliability Analysis and Factor Analysis)

Target tolerance: |error| < .001 for key statistics.

## Verification Datasets

Verification datasets are located in `src/lib/verification/reference-data.ts`. Each dataset has known structural properties:

- **High-reliability**: 30 rows × 5 items, expected α ≈ .85–.92
- **Multi-factor**: 50 rows × 6 items, 2-factor structure
- **Reverse-scored**: 30 rows × 4 items, Q2 and Q4 inverted
- **High-missing**: 50 rows × 5 items, ~30% NaN
- **Small-N**: 8 rows × 3 items, borderline reliability

## How to Contribute Verification

1. Run the reference datasets through R, Jamovi, or SPSS
2. Record the outputs
3. Update `src/lib/verification/reference-results.json` with the values
4. Run `npm run build` to verify the comparison engine passes

Expected reference values should only come from actual external tool output — never from estimation or AI generation.
