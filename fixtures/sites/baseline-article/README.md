# Fixture #1: Baseline Article (`baseline-article`)

> Static website baseline representing an accessible editorial article layout.
> Designed to pass axe-core and the planned keyboard checks; this does not certify WCAG, EAA, or ADA compliance.

---

## 1. Architectural & Accessibility Design Decisions

- **Pure Semantic HTML5 & CSS:** Zero JavaScript, no external resources or CDN dependencies, system fonts only (`system-ui`).
- **Landmark Architecture:**
  - `<header class="site-header">`
  - `<nav id="site-nav" aria-label="Primary Navigation">`
  - `<form id="search-form" role="search">`
  - `<main id="main" tabindex="-1">`
  - `<article id="article-content">`
  - `<aside id="article-sidebar" aria-label="Related Topics">`
  - `<footer id="site-footer">`
- **Skip Navigation:** `#skip-link` is the very first focusable element, targeting `#main`, revealed on `:focus`.
- **Target Sizes:** Interactive controls provide touch/click targets of at least $44 \times 44$ CSS px (inline article links maintain $\ge 24$ CSS px height).
- **Responsive Layout:** Fluid flexbox/grid layout without fixed element widths; document `scrollWidth` equals viewport width at 320 CSS px (no horizontal scrollbar).
- **Focus Management:** Active `:focus-visible` ring provides a 3px solid outline with a 2px offset (`#1e40af`).
- **Deterministic Computed Contrast Ratios (WCAG Relative Luminance Formula):**
  - Body text (`#1a202c` on `#ffffff`): **16.32:1**
  - Secondary text (`#4a5568` on `#ffffff`): **7.53:1**
  - Secondary text (`#4a5568` on `#f8fafc`): **7.19:1**
  - Primary interactive links (`#1a56db` on `#ffffff`): **6.18:1**
  - Focus ring & skip link background (`#1e40af` on `#ffffff`): **8.72:1**
  - Form control borders (`#4b5563` on `#ffffff`): **7.56:1**
  - Search button icon (`#ffffff` on `#1a56db`): **6.18:1**

---

## 2. Phase 1 Mutator Mapping (BLUEPRINT.md §11.2)

The table below maps all 20 mutators defined in `BLUEPRINT.md` section 11.2 to element IDs/selectors in `baseline-article`, or indicates whether the defect is injected by the mutator or requires subsequent fixtures:

| ID | Injected defect | Expected finding | Mapping / Target in `baseline-article` |
|---|---|---|---|
| M01 | Remove `alt` on informative image | axe image-alt | Targets `#article-figure img` (remove `alt`) |
| M02 | Alt text replaced with filename | L-001 | Targets `#article-figure img` (replace `alt` with `"figure.svg"`) |
| M03 | Input label disassociated | axe label | Targets `#search-form label[for="search-input"]` (remove `for` attribute or delete `<label>`) |
| M04 | Icon-only button without name | axe button-name | Targets `#search-button` (remove `.sr-only` span) |
| M05 | Clickable `div`, not focusable | K-001 | Injected by mutator (e.g. replace `#site-nav a` or `#search-button` with un-focusable `<div onclick>`) |
| M06 | `outline: none` on focus, no replacement | K-003 | Targets `:focus-visible` in `style.css` (override with `outline: none`) |
| M07 | Keyboard trap in a widget | K-002 | Injected by mutator (injected script) or needs fixture #2/#3 |
| M08 | Positive `tabindex` scramble | K-005 | Injected by mutator (inject `tabindex="5"` on `#search-input` or nav anchors) |
| M09 | Sticky header covers focused element | K-004 | Injected by mutator (inject `position: fixed` / `sticky` on `.site-header` covering focus target) |
| M10 | Skip link removed | K-006 | Targets `#skip-link` (remove `#skip-link` element from DOM) |
| M11 | Dialog opens, focus not moved in | K-007 | Needs fixture #2/#3 (modal/dialog fixture) |
| M12 | Dialog closes, focus not restored | K-007 | Needs fixture #2/#3 (modal/dialog fixture) |
| M13 | Error shown by color only; not associated | K-008 | Needs fixture #2/#3 (form fixture with dynamic validation) |
| M14 | Error not announced (no live region) | K-008 / K-011 | Needs fixture #2/#3 (form fixture with dynamic validation) |
| M15 | Fixed-width layout → horizontal scroll at 320px | K-009 | Injected by mutator (inject fixed width e.g. `min-width: 960px` on `.page-container`) |
| M16 | 12px tap targets | K-010 | Injected by mutator (override padding/min-dimensions on `.site-nav a` or `#search-button` to 12px) |
| M17 | Low contrast text | axe color-contrast | Injected by mutator (inject low-contrast color `#94a3b8` on body text) |
| M18 | Many "click here" links | L-002 | Injected by mutator (replace link text in `#site-nav` or `#article-content` with "click here") |
| M19 | Heading levels skipped / no h1 | axe + L-003 | Targets `#article-title` (remove `<h1>`) or `#heading-intro` (promote `<h2>` to `<h4>`) |
| M20 | Menu opens on hover only | K-001 / flow finding | Needs fixture #2/#3 (flyout dropdown menu fixture) |
