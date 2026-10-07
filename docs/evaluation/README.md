# AccessScout — Evaluation Framework & Benchmark Methodology

> **Status:** Active Evaluation Specification  
> **Core Principle:** Measurement precedes detection. We never claim a detector works without an automated benchmark proving recall and zero false positives on baseline sites.

---

## 1. Why Evaluation-Driven Development (EDD)?

In accessibility tooling, false promises are common: tools claim to detect WCAG compliance but either drown developers in false alarms (destroying trust) or miss critical real-world navigation barriers.

AccessScout solves this by adopting **Evaluation-Driven Development**:
1. We construct clean, fully accessible baseline sites where **zero accessibility violations** exist.
2. We build automated **Mutators** that inject specific, isolated accessibility defects into those baselines.
3. We run the engine against both the clean baseline and the mutated variants to scientifically measure **Precision** and **Recall**.

---

## 2. Evaluation Datasets

```
fixtures/
├── sites/                  # Clean baseline sites (Accessible by design)
│   ├── baseline-article/   # Fixture #1: Blog/article (plain semantic HTML)
│   ├── baseline-shop/      # Fixture #2: E-commerce with cart & checkout form
│   └── baseline-app/       # Fixture #3: Complex interactive app (dialogs, menus)
├── mutations/              # Synthetic defect mutators (M01, M02, ... M20)
├── judgments/              # Labeled LLM evaluation dataset (alt-text, link purpose)
└── expected/               # PROTECTED: Expected findings (Approved ground truth)
```

### 1. Baseline Fixtures
Static web applications authored to be 100% compliant with WCAG 2.2 AA standards:
- **Zero axe-core violations.**
- **Passes all keyboard checks (`K-001` through `K-011`).**
- Any finding detected on an unmutated baseline site represents a **False Positive**.

### 2. The Mutator Catalog
A programmatically applied mutation alters a clean baseline site to introduce exactly one flaw.

| Mutator ID | Injected Defect | Target Rule / Expected Finding |
|---|---|---|
| `M01` | Remove `alt` attribute from informative image | `axe:image-alt` |
| `M02` | Replace valid `alt` with image filename (`"IMG_0921.jpg"`) | `L-001` |
| `M03` | Disassociate `<label>` from `<input>` element | `axe:label` |
| `M04` | Icon-only button lacking accessible name | `axe:button-name` |
| `M05` | Clickable `<div>` without `tabindex` or role | `K-001` (Unreachable element) |
| `M06` | Remove CSS focus indicator (`outline: none`) without replacement | `K-003` (No visible focus) |
| `M07` | Introduce a JavaScript focus cycle with no exit (`Tab` / `Esc`) | `K-002` (Keyboard trap) |
| `M08` | Scramble focus order with positive `tabindex="5"` | `K-005` (Illogical focus order) |
| `M09` | Fixed sticky header obscuring focused elements | `K-004` (Obscured focus) |
| `M10` | Remove skip-navigation link on multi-landmark page | `K-006` (No skip link) |
| `M11` | Modal dialog opens but keyboard focus is not moved inside | `K-007` (Dialog focus) |
| `M12` | Modal dialog closes but focus is not restored to trigger | `K-007` (Focus restore) |
| `M13` | Form error signaled by red color only without error text association | `K-008` (Form error) |
| `M14` | Dynamic content update without `aria-live` region | `K-011` (Live region) |
| `M15` | Fixed-width layout causing horizontal scroll at 320 CSS px | `K-009` (Reflow) |
| `M16` | Clickable button with tap target smaller than $24\times24$ CSS px | `K-010` (Target size) |

---

## 3. Core Benchmark Metrics

1. **Recall (Sensitivity):**
   $$\text{Recall} = \frac{\text{Mutations Correctly Detected}}{\text{Total Mutations Injected}}$$
   - Target gate for deterministic checks (`axe` and `K-xxx`): $\ge 0.90$.

2. **False Positive Rate (Precision on Baseline):**
   $$\text{False Positives} = \text{Findings on Clean Baselines}$$
   - Target gate: **Must equal 0** on all approved baseline fixtures.

3. **Flake Rate:**
   $$\text{Flake Rate} = \frac{\text{Findings with inconsistent results across 5 runs}}{\text{Total Findings}}$$
   - Target gate: $\le 2\%$ on deterministic checks.

4. **Replay Confirmation Rate:**
   - Findings must reproduce in at least 2 of 3 fresh browser replay passes to achieve `status: "confirmed"`.

5. **LLM Judgment Metrics:**
   - Evaluated on a held-out test split of $\ge 100$ labeled human examples per category.
   - Evaluated using **Macro-F1**, **Accuracy**, and a **Confusion Matrix**.

---

## 4. Benchmark Execution & Quality Gates

The benchmark runner is executed via:
```bash
# Full evaluation against all fixtures and mutators
pnpm eval

# Fast smoke suite for local commits and PR gating (<2 minutes)
pnpm eval:smoke
```

### The PR Benchmark Diff Rule
Any pull request that modifies:
- Accessibility check logic (`packages/checks/**`)
- Agent judgment prompts or schemas (`packages/agent/**`)
- Mutators or fixture code (`fixtures/**`)

**MUST** execute the benchmark and attach a before-and-after metric diff table in the pull request description. Any regression in recall or any increase in baseline false positives blocks the pull request from merging.
