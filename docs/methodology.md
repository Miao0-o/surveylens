# Methodology

SurveyLens implements standard psychometric computations validated against established references.

## Reliability

### Cronbach's Alpha

Measures internal consistency among scale items.

Formula: α = (k / (k-1)) × (1 - Σσ²ᵢ / σ²ₓ)

Reference: Cronbach, L.J. (1951). Coefficient alpha and the internal structure of tests. *Psychometrika*, 16, 297-334.

**Interpretation:**

| α | Label |
|---|-------|
| ≥ .90 | Excellent |
| .80–.89 | Good |
| .70–.79 | Acceptable |
| .60–.69 | Questionable |
| < .60 | Poor |

### Standardized Alpha

Computed from the average inter-item correlation matrix. When close to raw α, item variances are approximately equal.

### McDonald's Omega

Factor-loading-based reliability estimate, computed from first factor loadings after varimax rotation. Less affected by item count than α.

### Item-Total Correlation

Pearson correlation between each item and the sum of all other items in the scale. Values below .20 may indicate problematic items.

### Alpha-if-Deleted

Recomputes α with each item removed. An increase > .05 suggests the item may not measure the same construct.

---

## Validity

### Construct Relationships

Scale-level Pearson correlation matrix. Used for evaluating relationships between constructs.

**Interpretation:**

| |r| | Relationship |
|-----|-------------|
| < .30 | Weak |
| .30–.50 | Moderate |
| ≥ .50 | Strong |
| ≥ .80 | Potential overlap |
| ≥ .90 | Potential redundancy |

Note: These are descriptive labels, not definitive validity claims. Formal convergent/discriminant validity assessment requires theoretical expectations.

---

## Factor Analysis

### KMO (Kaiser-Meyer-Olkin)

Measures sampling adequacy for factor analysis.

Reference: Kaiser, H.F. (1974). An index of factorial simplicity. *Psychometrika*, 39, 31-36.

**Interpretation:** ≥ .80 excellent, ≥ .60 acceptable, < .60 weak.

### Bartlett's Test of Sphericity

Tests whether the correlation matrix is significantly different from an identity matrix. Requires p < .05.

### Exploratory Factor Analysis

Principal components extraction with varimax rotation. Factor count suggested by Kaiser criterion (eigenvalue > 1), with interpretability constraints applied.

### Structure Consistency

Compares user-defined scales with observed factor structure. Computes the proportion of scale items loading on the dominant factor, weighted by loading strength.

---

## Stability

### Bootstrap Stability

Cronbach's α is recomputed on 200 bootstrap resamples at increasing sample sizes. The "elbow" point in the α curve estimates the minimum sample size for stable estimates.

---

## Readiness

Composite score (0-100) combining:

- Reliability (30%)
- Factor structure (25%)
- Structure consistency (20%)
- Statistical stability (10%)
- Sample size (10%)
- Missing data (5%)

Quality gates (must-pass thresholds) override the readiness score. A gate failure downgrades status regardless of score.

---

## References

- Cronbach, L.J. (1951). *Psychometrika*, 16, 297-334.
- Kaiser, H.F. (1974). *Psychometrika*, 39, 31-36.
- Bartlett, M.S. (1950). *British Journal of Psychology*, 3, 77-85.
- McDonald, R.P. (1999). *Test theory: A unified treatment*. Erlbaum.
- Revelle, W. (2024). *psych: Procedures for psychological, psychometric, and personality research*. R package.
