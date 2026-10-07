# AccessScout — System Architecture

> **Status:** Locked Architectural Blueprint  
> **Target Release:** v0.1.0  
> **Browser Scope:** Chromium Only (Firefox & WebKit deferred)

---

## 1. Architectural Philosophy

AccessScout is an automated accessibility testing engine engineered to evaluate websites through the lens of **active user interaction and keyboard navigation**.

Standard static rule engines (e.g., `axe-core`) analyze static DOM snapshots and miss stateful, dynamic, and keyboard-specific barriers. AccessScout bridges this gap by driving deterministic browser automation, recording user interaction steps, and producing **reproducible, evidence-backed findings**.

### Core Tenets
1. **Engine-First:** The engine is an autonomous TypeScript library. The CLI, GitHub Action, and Web App are thin clients that wrap the engine.
2. **Evaluation-First:** Measurement infrastructure (fixtures, synthetic mutators, scoring engines) precedes detection logic.
3. **Deterministic Isolation:** Deterministic checks (`A-xxx`, `K-xxx`) run completely independent of the LLM layer. An LLM failure never prevents deterministic checks from succeeding.
4. **Zero-Secret Sandbox:** Processes that browse untrusted websites hold zero third-party API keys.
5. **Incremental Evolution:** Packages and modules are created only when required by the active milestone or to enforce a necessary architectural boundary. No speculative or empty placeholder packages.

---

## 2. High-Level Architecture Diagram

```
                     ┌────────────────────────┐
                     │       Consumers        │
                     │  - packages/cli        │
                     │  - apps/web (Future)   │
                     │  - GitHub Action (Fut) │
                     └───────────┬────────────┘
                                 │
                                 ▼
                     ┌────────────────────────┐
                     │      packages/core     │
                     │  - Browser Session     │
                     │  - Step Recorder       │
                     │  - Observers & Limits  │
                     └───────────┬────────────┘
                                 │
                   ┌─────────────┴─────────────┐
                   ▼                           ▼
        ┌───────────────────────┐   ┌───────────────────────┐
        │    packages/checks    │   │    packages/agent     │
        │ - axe-core (A-001)    │   │ - Bounded LLM Judgments│
        │ - Keyboard (K-001..11)│   │   (L-001..L-004)      │
        │ - Zero LLM dependency │   │ - Task Agent Flows    │
        └──────────┬────────────┘   └──────────┬────────────┘
                   │                           │
                   └─────────────┬─────────────┘
                                 │
                                 ▼
                     ┌────────────────────────┐
                     │    packages/schema     │
                     │  - Zod Schemas         │
                     │  - Contracts & Types   │
                     │  - Zero dependencies   │
                     └────────────────────────┘
```

---

## 3. Package Structure & Boundaries (Strict DAG)

To prevent circular dependencies and spaghetti coupling, package dependencies flow strictly downward:

| Package | Responsibility | Allowed Dependencies | Prohibited Dependencies |
|---|---|---|---|
| `packages/schema` | Type contracts, finding structures, Zod validators. | None (pure zero-dep). | All other packages. |
| `packages/core` | Playwright orchestration, sandbox lifecycle, step recorder. | `packages/schema` | `packages/checks`, `packages/llm`, `packages/agent`. |
| `packages/checks` | Deterministic accessibility rules (axe wrapper, keyboard checks). | `packages/schema`, `packages/core` | `packages/llm`, `packages/agent`. |
| `packages/llm` | Gateway client, provider adapters, token budgeting, caching. | `packages/schema` | `packages/core`, `packages/checks`. |
| `packages/agent` | Task flows, bounded judgments, interaction state machines. | `packages/schema`, `packages/core`, `packages/llm` | None. |
| `packages/eval` | Test fixtures, synthetic mutators, precision/recall scorer. | `packages/schema`, `packages/checks`, `packages/agent` | None. |
| `packages/cli` | Command-line interface (`scan`, `eval`, `replay`). | All packages (entry point). | None. |
| `apps/web` | Web dashboard, OAuth, Postgres persistence, LLM Gateway. | `packages/schema` (calls runner/CLI out-of-process). | Direct engine execution in-process. |

---

## 4. Scan Execution Lifecycle

Every scan executes in a deterministic, phased pipeline:

1. **Initialization:**
   - Fresh browser context created in Chromium with strict security parameters (no persistent profile, non-HTTP(S) blocked, same-origin policy enforced).
   - Target URL loaded with resource limits (timeout: $\le 30\text{s}$, max network payload limits).

2. **Observation (Static Baseline):**
   - Capture modern accessibility tree via `page.ariaSnapshot()`.
   - Inventory interactive elements (`a`, `button`, `input`, `select`, `textarea`, ARIA roles).
   - Capture compressed viewport screenshot and compute bounding boxes.

3. **Static Rule Analysis:**
   - Execute `@axe-core/playwright` (`A-001`).
   - Extract WCAG 2.0–2.2 A/AA violations; isolate best-practice recommendations into separate categories.

4. **Deterministic Keyboard Traversal:**
   - Programmatically traverse focusable elements using sequenced keyboard inputs (`Tab`, `Shift+Tab`).
   - Run Check `K-001`: Unreachable interactive elements (elements in DOM inventory not reached via Tab).
   - Run Check `K-002`: Keyboard traps (cycles in focus path that cannot be exited via `Tab` or `Escape`).
   - Run Check `K-003`: Visible focus indicators (computed style inspection + pixel delta verification on focused elements).
   - Run Check `K-004`: Obscured focus (focused element covered by fixed/sticky headers via `elementFromPoint`).

5. **Bounded LLM Judgments (Optional / Phase 4):**
   - Evaluate textual clarity: `L-001` (alt-text adequacy), `L-002` (link purpose), `L-003` (heading semantics), `L-004` (form error clarity).
   - All LLM findings are marked `status: "needs-review"` and `source: "llm"`.

6. **Interactive Task Flows (Optional / Phase 5):**
   - High-level keyboard task execution (e.g., open dialog, submit staging form).
   - Trigger Check `K-007` (dialog focus trapping and restoration) and Check `K-008` (form error announcement).

7. **Normalization & Fingerprinting:**
   - Aggregate raw violations into unified `Finding` objects.
   - Generate deterministic `fingerprint`: `hash(ruleId + normalizedSelector + pageUrl + stepSequenceHash)`.
   - Deduplicate findings.

8. **Replay & Confirmation:**
   - Replay each finding's recorded `steps` across 3 independent, fresh browser contexts.
   - If reproduced in $\ge 2$ of 3 runs: mark `status: "confirmed"`.
   - If reproduced in $< 2$ of 3 runs: mark `status: "unconfirmed"` (flaky/non-deterministic).

9. **Report Generation:**
   - Emit validated JSON report matching `packages/schema`.
   - Render human-readable Markdown summary and SARIF output.

---

## 5. Architectural Boundaries & Locked Constraints

- **Single Browser Engine for v0.1:** Chromium is the sole supported target. Multi-browser support (Firefox/WebKit) will only be considered once Chromium benchmarks achieve zero flake and $\ge 0.90$ mutator recall.
- **Strict Separation of Privilege:** The browser runner has zero visibility into third-party LLM API keys. It communicates only with the LLM Gateway using short-lived tokens.
- **Mandatory Legal Disclaimer:** Every generated report, CLI summary, and UI screen must prominently display:
  > *"Automated findings only. This tool does not certify WCAG, EAA, or ADA compliance and cannot replace manual testing with assistive technology and real users."*
