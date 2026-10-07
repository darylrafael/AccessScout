# AccessScout — Build Plan

> Companion to `BLUEPRINT.md` (what/how) and `AGENTS.md` (coding rules).
> Timelines are **estimates for part-time work** (not measured). Numeric targets are **provisional** until the first benchmark baseline exists.

## 0. How to use this plan with your coding agent (plan mode)

(Assumption: your agent reads `AGENTS.md` at the repo root. If it does not, paste its contents at the start of each session.)

Per phase:
1. Make sure `AGENTS.md`, `BLUEPRINT.md`, `PLAN.md` are in the repo root and committed.
2. Open your agent in **plan mode**. Paste the phase's *Agent prompt* (below). Ask it to list assumptions, unknowns, and files it will touch **before** writing code.
3. Review the plan. Reject plans that: skip tests, change `fixtures/expected/**`, add dependencies without justification, or give the browser process access to secrets.
4. Let it implement in small commits. Require `pnpm lint && pnpm typecheck && pnpm test` and `pnpm eval:smoke` after each step.
5. Before merging: run the PR review checklist (section 12). Attach the benchmark before/after diff for any change to checks, mutators, prompts, or fixtures.
6. Update docs and add an ADR in `docs/adr/` for any non-obvious decision.

Rules that save you from silent failures:
- **Eval first, features second.** The benchmark is how you know the agent's code works.
- **Humans own the ground truth.** Expected outcomes, labeled datasets, and thresholds are written/approved by you.
- **Verify APIs against current docs.** Playwright and axe change; do not rely on remembered shapes (e.g., use `page.ariaSnapshot()`, not the older `page.accessibility.snapshot()`).

## 1. Timeline (estimates)

| Phase | Weeks | Deliverable | Release |
|---|---|---|---|
| 0 Bootstrap | 1 | Monorepo, CI, first fixture site | — |
| 1 Eval harness | 2 | Mutators + scorer + null-detector baseline | — |
| 2 Core engine v0 | 3–4 | axe + keyboard checks, CLI, JSON report | **A (CLI + benchmark)** after Phase 6 |
| 3 Web MVP + runners | 5–6 | Verified sites, scans, report viewer | **B** |
| — **Checkpoint 1** | end of wk 6 | Go / switch decision | — |
| 4 LLM layer + judgments | 7–8 | Gateway, caching, L-001..L-004, labeled set | — |
| 5 Task agent + flows | 9–10 | Dialog/form/menu flows, safety tests | — |
| 6 Replay + regression diff | 11 | Confirmation, flake stats, scan diffs | **A** |
| 7 CI integration | 12 | GitHub Action, PR comments, SARIF | **C** |
| 8 Screen reader (optional) | 13–14 | Guidepup module, advisory findings | **D** |
| 9 Release | final week | Docs, benchmark report, v0.1.0 | — |

**Order note:** Phase 6 is short and high-value; if time is tight, do it right after Phase 2 and before Phase 3, and ship Release A (CLI + benchmark) first.

### Cut list (in this order, if behind)
1. Phase 8 (screen reader). 2. Phase 7 (CI action). 3. Web UI polish and share links. 4. Task-agent breadth (keep dialog + form flows only).
**Never cut:** the eval harness, replay/confirmation, security tests, disclaimers.

## 2. Phase 0 — Bootstrap (Week 1)

**Goal:** a clean, tested, CI-checked skeleton.

Tasks
- [ ] Init pnpm workspace with packages/apps layout from `BLUEPRINT.md` §7.
- [ ] TypeScript strict, ESLint, Prettier, Vitest (the only test runner); the plain `playwright` library (Chromium only) used inside Vitest tests.
- [ ] Scripts in Phase 0: `format:check`, `lint`, `typecheck`, `test`. (`eval` and `eval:smoke` arrive in Phase 1. `tsup` is decided in an ADR and installed in Phase 2.)
- [ ] `.gitattributes` (LF endings) and Prettier `endOfLine: "lf"`; pin pnpm via `packageManager` and Node via a version file.
- [ ] GitHub Actions `ci.yml` (`permissions: contents: read`; `pnpm install --frozen-lockfile`; Playwright Chromium install with system deps; format check, lint, typecheck, test).
- [ ] Choose license (MIT or Apache-2.0); check dependency license compatibility (assumption A5).
- [ ] `.env.example`, `CODEOWNERS` protecting `fixtures/expected/**` and `fixtures/judgments/**`.
- [ ] ADR-0001: "Engine-first; web/CI wrap the CLI."
- [ ] Fixture site #1 (article/blog, plain HTML/CSS) + a tiny `node:http` static server for tests. It must include targets for mutators M01-M08: an informative image with good alt text, a search form with a labeled input, a menu-toggle button with an accessible name, a skip link, visible focus styles, descriptive links, and a proper heading outline.
- [ ] Test: baseline site has **zero axe violations** (explicit tags: wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa; log `incomplete` results). The `typecheck` gate becomes meaningful once the first `.ts` file exists; do not add a dummy file.

Acceptance
- CI green on a fresh clone; baseline test passes; repo public.

Agent prompt
```
Read AGENTS.md, BLUEPRINT.md, PLAN.md Phase 0. Plan (do not code yet): list the exact files you will create, versions you will pin (verify latest stable versions from official sources), assumptions, and risks. Then wait for approval.
```

## 3. Phase 1 — Evaluation harness first (Week 2)

**Goal:** measurement exists before detection does.

Tasks
- [ ] Fixture sites #2 (shop with cart + checkout-like form) and #3 (forms + dialog + menu) — start with #2 minimal.
- [ ] Mutator framework: each mutator = (id, description, apply(fixture) → mutated site, expected findings).
- [ ] Implement mutators M01–M08 (see `BLUEPRINT.md` §11.2).
- [ ] Scorer: recall per mutator, baseline false positives, JSON output + Markdown table.
- [ ] `accessscout eval` and `pnpm eval:smoke` (small subset, <2 min).
- [ ] "Null detector" engine stub that returns no findings.

Acceptance
- `pnpm eval` runs end to end: recall 0 for all mutators, baseline FP 0; output deterministic across two runs.
- Expected-outcome files live in `fixtures/expected/` and are CODEOWNERS-protected.

Agent prompt
```
Phase 1: build the evaluation harness before any detector. Plan first: mutator interface, expected-findings format, scorer metrics, file layout, how determinism is guaranteed. Do not implement checks. List what you need me to decide (e.g., expected rule ids per mutator).
```

## 4. Phase 2 — Core engine v0 (Weeks 3–4)

**Goal:** first real findings, measured.

Tasks
- [ ] `schema` package (Zod) for config, steps, evidence, findings, report; export JSON Schema.
- [ ] `core`: browser session (fresh context), limits, page observe (ARIA snapshot via current Playwright API, compressed screenshot), step recorder.
- [ ] `checks`: A-001 (axe wrapper, WCAG-tagged, best-practice separate), K-001, K-002, K-003; K-004 if time.
- [ ] Normalization: severity mapping, WCAG mapping, fingerprint, dedupe.
- [ ] `cli`: `scan <url>` → `report.json` + `report.md`.
- [ ] Extend mutators M09–M12 (where checks exist); tune until gates pass.

Acceptance (provisional)
- Deterministic-mutator recall ≥ 0.90; baseline false positives = 0 on fixtures.
- Report validates against schema; scan of a fixture site < 60 s.
- Every finding has replayable `steps` and at least one evidence item.

Agent prompt
```
Phase 2: implement core engine v0 per BLUEPRINT.md §8. Plan first: package boundaries, the Check interface, how keyboard traversal and trap detection work (algorithms, termination, limits), how focus-visible is measured, and how steps are recorded for replay. Verify Playwright/axe APIs against current docs. Tests first; run eval after each check.
```

## 5. Phase 3 — Web MVP and runners (Weeks 5–6)

**Goal:** end-to-end scan from a browser.

Tasks
- [ ] **Read GitHub terms about using Actions as scan workers (assumption A1).** Record the conclusion in an ADR. If unclear, default to `LocalProcessRunner` + Docker Compose and document.
- [ ] Next.js app, Auth.js (GitHub OAuth), Drizzle + Postgres migrations.
- [ ] Sites + ownership verification (well-known file, DNS TXT, meta tag) with **SSRF-hardened** fetcher and tests.
- [ ] Scans API; `Runner` interface; `LocalProcessRunner`; `GitHubActionsRunner` (workflow_dispatch + signed callbacks).
- [ ] Presigned uploads for screenshots; report ingestion with Zod validation.
- [ ] Report viewer (filters, finding detail, steps, screenshots, copyable replay command); shared read-only links (revocable).
- [ ] Rate limits; demo-site allowlist; kill switch; `docker-compose.yml`; free-tier deployment.

Acceptance
- From the UI: add demo site → run scan → see findings with screenshots and steps.
- SSRF tests: private IPs, redirect-to-private, DNS-rebinding simulation are all blocked.
- Test proves the runner environment contains **no provider API keys**.
- Disclaimer visible on every report page.

**Checkpoint 1 (end of Week 6):** Does it find real problems on demo sites? Do you still want to build this? If not, switch to the maintainer-triage project; Phases 0–2 skills transfer (sandboxed automation, evals).

Agent prompt
```
Phase 3: build the web MVP per BLUEPRINT.md §5, §9, §10. Plan first: data model migrations, API contracts (Zod), the Runner interface and both implementations, the callback signing scheme, SSRF defenses for the verification fetcher, and the test plan for security properties. Do not add dependencies without listing alternatives. Flag anything that depends on free-tier limits.
```

## 6. Phase 4 — LLM layer and judgments (Weeks 7–8)

**Goal:** bounded, measured AI judgments through a safe gateway.

Tasks
- [ ] `LlmClient` interface; `DirectProvider` (Gemini, Groq, Ollama); `GatewayClient`; provider routing config.
- [ ] Gateway endpoint `/api/llm/complete`: scan-scoped token, budgets, taskType allowlist, size limits, cache by content hash, logging with redaction.
- [ ] Structured output with Zod validation; retry once; diagnostics on invalid output.
- [ ] Prompts as versioned files; L-001 alt text, L-002 link/button purpose, L-003 headings, L-004 form messages.
- [ ] Labeled dataset (≥100 per type), labeling guidelines, dev/test split (**you** label and approve).
- [ ] Judgment eval: accuracy, macro-F1, confusion matrix; model comparison table.
- [ ] Prompt-injection test pages and tests.

Acceptance (provisional)
- Eval reports metrics on the held-out split with model ids and prompt versions.
- Budget exceeded → gateway returns an error and the scan records a diagnostic.
- Injection suite: no test page changes the model's task or triggers a disallowed action.
- LLM-only findings are never `confirmed`.

Agent prompt
```
Phase 4: implement the LLM layer and judgments per BLUEPRINT.md §5.6, §8.4, §10. Plan first: interface, gateway request/response schemas, budget accounting, caching keys (what is hashed and why), prompt file format/versioning, and the injection test design. Do not write prompts that rely on the model "obeying" instructions for safety; safety comes from schemas, allowlists, and validation.
```

## 7. Phase 5 — Task agent and flow checks (Weeks 9–10)

**Goal:** keyboard-only flows that expose dialog, menu, and form problems.

Tasks
- [ ] Action executor with strict allowlist (see `BLUEPRINT.md` §8.5); element references validated against the current ARIA snapshot.
- [ ] Task proposal prompt; `focusByTabbing(name, maxTabs)`.
- [ ] Observers: focus path, ARIA diffs, live-region events.
- [ ] Checks K-007 (dialog), K-008 (form errors), K-011 (status messages).
- [ ] Flow fixtures + mutators M11–M14, M20; agent traces saved to the report diagnostics.
- [ ] Safety tests: model attempts disallowed actions → blocked, logged, scan continues.

Acceptance (provisional)
- Flow-mutator recall measured and reported; baseline FP = 0.
- Zero disallowed actions executed in safety tests.
- Budgets enforced (steps, tasks, LLM calls, timeout).

Agent prompt
```
Phase 5: implement the task agent per BLUEPRINT.md §8.5. Plan first: the state machine, action validation, how targets are resolved without trusting model-provided selectors, what each observer records, and the safety test matrix. List failure modes (loops, hangs, navigation off-origin) and how each is bounded.
```

## 8. Phase 6 — Replay, confirmation, regression diff (Week 11)

Tasks
- [ ] Replay engine (fresh context ×3); statuses `confirmed` / `unconfirmed` / `needs-review`.
- [ ] Per-check flake-rate measurement across repeated runs.
- [ ] Scan-to-scan diff: new / fixed / persisting (by fingerprint).
- [ ] UI and CLI surfaces for statuses and diffs.

Acceptance
- Replay works from the CLI on a saved report.
- Benchmark reports confirmation rate and flake rate per check.
- Diff correctly reports changes when a mutator is added/removed.

Agent prompt
```
Phase 6: implement replay and confirmation. Plan first: step determinism (waits, animation, randomness), what counts as "reproduced", how flake is measured, fingerprint stability rules. Identify steps that cannot be made deterministic and how they are labeled.
```

## 9. Phase 7 — CI integration (Week 12)

Tasks
- [ ] GitHub Action (composite or JS/Docker) that scans a preview/staging URL.
- [ ] PR comment with **new findings only**, collapsed details; links to report artifact.
- [ ] SARIF output + upload to code scanning (public repos).
- [ ] Example workflow + docs; demo repo showing a PR that introduces a defect.

Acceptance
- A demo PR shows a comment listing the newly introduced finding; SARIF appears in code scanning.
- Action runs without provider keys in untrusted contexts (document the secure pattern for forks).

Agent prompt
```
Phase 7: build the GitHub Action and PR comment flow. Plan first: how it handles fork PRs safely (no secrets for untrusted code), how it finds "new" findings, SARIF mapping, and failure modes (flaky URL, timeouts). Follow GitHub's guidance on pull_request vs pull_request_target.
```

## 10. Phase 8 — Screen reader module (optional, Weeks 13–14)

Tasks
- [ ] Guidepup integration on Windows (NVDA) and macOS (VoiceOver) runners in the public repo; virtual screen reader fallback on Linux.
- [ ] Capture spoken output for key flows (navigation, form errors, dialogs); compare to expected accessible names.
- [ ] Findings `S-001`, **advisory** status only; transcript as evidence; flake study.

Acceptance
- Workflow runs on public-repo runners; transcripts attached; flake rate documented; limitations written down.

Agent prompt
```
Phase 8: add an optional screen-reader module using Guidepup. Plan first: runner setup steps, how transcripts are normalized, what is compared and why, and the flake mitigation strategy. Mark all findings advisory. Verify setup instructions against current Guidepup docs.
```

## 11. Phase 9 — Release (final week)

Tasks
- [ ] README (outline in `BLUEPRINT.md` §13), demo GIF, quick start in ≤3 commands.
- [ ] `docs/benchmark-report.md`: methodology, results, failures, limitations, how to reproduce.
- [ ] `SECURITY.md`, `CONTRIBUTING.md`, issue templates, code of conduct.
- [ ] Versioning/changelog; publish CLI to npm; tag `v0.1.0`.
- [ ] Share: GitHub release, a short write-up, relevant developer and accessibility communities.

Acceptance
- Fresh clone → quick start works; `pnpm eval` reproduces published numbers within documented tolerance.

## 12. PR review checklist (use every time)

1. Tests added/updated; CI green.
2. Benchmark before/after attached if checks, mutators, prompts, or fixtures changed.
3. `fixtures/expected/**` and `fixtures/judgments/**` unchanged, or explicitly approved by the owner.
4. No secrets in code, logs, fixtures, or CI output; browser/runner processes hold no provider keys.
5. Action allowlist and budgets unchanged, or the change is justified in an ADR.
6. New dependencies justified (maintenance, license, size).
7. Library APIs verified against current official docs.
8. UI/report copy never claims compliance; disclaimer present.
9. Docs updated (check reference, ADR if needed).
10. Free-tier assumptions re-checked if the change depends on them.

## 13. Global definition of done (v0.1.0)

- Public repo, license, README, docs, CI green.
- CLI scan works on fixtures and a demo site; report validates against schema.
- Benchmark published with failures and limitations; reproducible.
- Findings are replayable; statuses implemented.
- Security tests (SSRF, secrets lanes, injection, action allowlist) pass.
- Disclaimers present everywhere findings are shown.

## 14. Weekly rhythm (suggested)

- Start of week: pick the next phase tasks; ask the agent for a plan; review it.
- Mid-week: implement + run eval after each change.
- End of week: update benchmark table, write a short log (what worked, what failed), decide go/cut using the cut list.
