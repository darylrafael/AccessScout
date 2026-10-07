# Fixture #1: Baseline Article (`baseline-article`)

> Clean, accessible static website baseline for Phase 0 calibration and Phase 1 mutation testing.

---

## 1. Architectural & Accessibility Design Decisions

- **Pure Semantic HTML5 & CSS:** Zero JavaScript, no external resources, system fonts only (`system-ui`).
- **Valid Landmark Hierarchy:** Includes `header`, `nav` (`aria-label="Primary Navigation"`), `main` (`tabindex="-1"`), `article`, `aside` (`aria-label="Related Topics"`), and `footer`.
- **Skip Navigation:** `#skip-link` is the first focusable control, targeting `#main`, revealed on `:focus`.
- **High-Contrast Palette:**
  - Body text (`#1a202c` on `#ffffff`): **15.3:1** (exceeds WCAG AAA 7:1).
  - Links (`#1a56db` on `#ffffff`): **7.5:1** (exceeds WCAG AA 4.5:1).
  - Focus indicator (`#1e40af` on `#ffffff`): **8.8:1** (exceeds WCAG 2.2 3:1).
  - Control borders (`#4b5563` on `#ffffff`): **5.7:1** (exceeds WCAG 2.2 3:1).
- **Responsive Layout:** Fluid layout without fixed widths; zero horizontal scroll at 320 CSS px width.
- **Target Sizes:** Touch targets meet or exceed $44 \times 44$ CSS px.

---

## 2. Phase 1 Mutator Target Mappings

| Mutator ID | Description | Target Element ID / Selector | Expected Finding |
|---|---|---|---|
| `M01` | Missing `alt` on informative image | `#article-figure img` | `axe:image-alt` |
| `M02` | Alt text replaced with filename | `#article-figure img` | `L-001` |
| `M03` | Disassociate `<label>` from `<input>` | `#search-form label[for="search-input"]` | `axe:label` |
| `M04` | Icon-only button lacking accessible name | `#search-button` | `axe:button-name` |
| `M05` | Clickable `div` not focusable | `#site-nav a` replaced with un-focusable `div` | `K-001` |
| `M06` | Remove CSS focus indicator | `:focus-visible` in `style.css` | `K-003` |
| `M07` | Introduce focus cycle trap | Focus loop inside `#main` | `K-002` |
| `M08` | Scramble focus order with positive tabindex | `tabindex="5"` on `#search-input` | `K-005` |
| `M09` | Fixed sticky header covering focus | `.site-header` set to `position: fixed` | `K-004` |
| `M10` | Remove skip-navigation link | `#skip-link` removed from DOM | `K-006` |
| `M19` | Skipped heading level (`h1` -> `h3`) | `#heading-intro` altered to `<h3>` | `axe:heading-order` / `L-003` |
