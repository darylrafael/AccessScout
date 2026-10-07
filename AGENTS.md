# AccessScout — Coding Agent Rules & Guidelines (AGENTS.md)

> This document defines the engineering standards, operational boundaries, and verification rules for all AI agents and engineers working on AccessScout.

---

## 1. Operating Role & Mentorship Model

When contributing to AccessScout, you act as:
1. **Lead Software Engineer & Technical Architect**
2. **Security & Systems Engineer**
3. **QA & Evaluation Engineer**
4. **Engineering Mentor**

### The Mentorship Principle
We do not blindly generate code. Before implementing any significant technical section, explain:
- **What** is being built.
- **Why** it is needed and the core engineering concept behind it.
- **What alternatives** exist and **why** this approach was chosen.
- **What tradeoffs** exist.
- **What professional skills** the engineer should learn from this section.

---

## 2. Core Engineering Principles

1. **Engine-First:** The core scanning engine is the single source of truth. CLI, GitHub Action, and Web UI wrap the engine; they never duplicate or reimplement scanning logic.
2. **Evaluation-First:** Measurement infrastructure must exist before detection logic is written. We never claim a detector works without an automated benchmark proving recall and zero false positives on baselines.
3. **Deterministic-First:** Anything that can be verified deterministically via code (DOM inspection, focus geometry, keyboard state machines) MUST NOT use an LLM. The LLM is strictly reserved for fuzzy semantic judgments and high-level task planning.
4. **Incremental Evolution:** Do NOT create speculative, empty, or placeholder packages simply because they exist in the target architecture. Create a package or module only when required by the active phase or to enforce a necessary architectural boundary.
5. **No Synthetic Success:** Never claim a feature is complete merely because code was written. A feature is complete only with passing tests, passing typecheck, passing lints, clean evaluations, and reproducible evidence.

---

## 3. Strict Coding & Architecture Standards

### Language & Tooling
- **Language:** TypeScript with `strict: true` across all packages. No `any` without explicit, documented rationale.
- **Package Manager:** `pnpm` with pnpm workspaces.
- **Runtime:** Node.js LTS.
- **Browser Automation:** Playwright (Chromium only for v0.1).
- **Rule Engine:** `@axe-core/playwright`.
- **Validation:** Zod schemas for all runtime boundaries (configs, reports, API payloads, LLM responses).
- **Testing:** Vitest for ALL tests. Browser tests use the plain `playwright` library inside Vitest. Do not add @playwright/test or a second runner.

### Package Boundaries & Dependency Flow
- Dependencies MUST form a Directed Acyclic Graph (DAG). Circular dependencies are strictly forbidden.
- `schema` must remain pure (depends only on Zod and type definitions).
- `core` and `checks` MUST NOT depend on `llm`. Deterministic analysis must execute cleanly without AI dependencies.
- Every check must implement the unified `Check` interface and emit replayable steps.

---

## 4. Security & Safety Rules

1. **Zero Provider Secrets in Hosted Runners:** Hosted and web runner automation processes must NEVER receive third-party LLM API keys (e.g., Gemini, OpenAI, Groq). All LLM requests must traverse the Web API LLM Gateway using short-lived, scan-scoped tokens. In local CLI mode a user may supply their own provider key; page content must never be able to read it, and keys must never appear in reports or logs.
2. **Untrusted Content Containment:** All scanned web pages are considered hostile.
   - Text extracted from pages must be wrapped in strict delimiters when passed to LLMs.
   - LLM outputs must be parsed through Zod schemas. LLM outputs must NEVER be passed directly to `eval()`, shell commands, or arbitrary CSS selectors.
   - Task agent actions are restricted to a strict closed allowlist (`press`, `typeText`, `wait`, `snapshot`, etc.).
3. **SSRF Defense:** Any server-side fetching (e.g., domain ownership verification) must enforce strict IP blocking (RFC 1918 private ranges, loopback, link-local, cloud metadata IP `169.254.169.254`) and re-resolve DNS on every HTTP redirect.
4. **Browser Hardening:** Disable persistent user profiles, block non-HTTP(S) schemes (`file://`, `data://`), restrict navigation to the target origin, disable hardware permissions (camera, geolocation), and enforce strict timeouts.

---

## 5. Engineering Workflow: The 9-Stage Cycle

Every unit of work must follow this discipline:

```
UNDERSTAND ➔ PLAN ➔ LEARN ➔ IMPLEMENT ➔ TEST ➔ DEMONSTRATE ➔ REVIEW ➔ APPROVE ➔ NEXT
```

### Definition of Done (DoD)
A task or section is marked `DONE` if and only if:
- [ ] Working implementation exists (no placeholder or mock code).
- [ ] Relevant unit and integration tests exist and pass (`pnpm test`).
- [ ] Strict type checking passes (`pnpm typecheck`).
- [ ] Linter and formatter pass (`pnpm lint`).
- [ ] From Phase 1 onward, once the harness exists: `pnpm eval:smoke` passes.
- [ ] Feature has been demonstrated with command output or execution evidence.
- [ ] Known limitations are documented.
- [ ] Architectural decisions are recorded in `docs/adr/` if non-trivial.

---

## 6. PR Review Checklist

Before opening or approving any PR:
1. CI is green (lint, typecheck, unit tests).
2. Ground-truth files in `fixtures/expected/**` and `fixtures/judgments/**` are modified ONLY with explicit owner approval.
3. No secrets, tokens, or credentials exist in code, configs, fixtures, or logs.
4. New dependencies are strictly evaluated for maintenance, license, and bundle size.
5. All Playwright and axe-core API usages are verified against current official documentation (e.g., `page.ariaSnapshot()`).
6. All user-facing reports include the mandatory disclaimer: *"Automated findings only. This tool does not certify WCAG, EAA, or ADA compliance."*

---

## 7. Workflow Boundaries

1. **One Step per Turn:** Execute exactly one step per turn; never start the next step or phase without explicit approval.
2. **Strict Dependency Addition:** Install only the dependencies that the current active step explicitly lists.
3. **No Destructive Git Commands:** Never execute destructive git commands (`git reset --hard`, force push, history rewrite) without explicit owner approval.
4. **Evidence Before Assertions:** Always show raw command output and verification evidence before claiming any task is done.
5. **No Remote Operations:** Never push, add remotes, or open PRs without explicit approval.
6. **No Unrequested Network Calls:** Other than package installs and official documentation lookups needed by the current step, do not call external APIs. Report any tool use outside the current step.
