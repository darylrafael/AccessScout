# ADR-0001: Engine-First Architecture with CLI as Primary Consumer

- **Status:** Accepted
- **Date:** 2026-10-07
- **Author:** Lead Software Engineer & Technical Architect
- **Context:** AccessScout

---

## Context and Problem Statement

AccessScout is intended to deliver three distinct interfaces:
1. A **Command Line Interface (CLI)** for local developer workflows.
2. A **GitHub Action** for automated pull request scanning in CI.
3. A **Web Application** for site ownership verification, remote scans, and team dashboard reporting.

A common architectural pitfall in developer tooling is building a web platform first and embedding the scanning logic directly into web API handlers or frontend-centric frameworks. This often leads to tight coupling with database schemas, session frameworks, and serverless runtime constraints, making the scanning engine difficult to run in local terminals, offline environments, or isolated CI jobs.

We need an architectural model that ensures high testability, zero runtime lock-in, immediate developer utility, and long-term portfolio showcase value.

---

## Decision Drivers

- **Reliability over features:** The scanner must work deterministically regardless of where it is invoked.
- **Explainability and clean boundaries:** System components must have clear, defensible separation of concerns.
- **Developer adoption & speed:** Developers need a tool that runs with zero cloud setup (`accessscout scan <url>`) on their local dev servers.
- **Evaluation-first methodology:** The benchmark and synthetic defect injection suite must be able to run directly against the engine in fast, automated CI test cycles without spinning up databases or full web stacks.
- **Incremental delivery:** We want to reach a functional, portfolio-ready release (Release A: CLI + Benchmark) before tackling distributed web runners.

---

## Considered Options

1. **Option 1: Web-First Architecture**
   Build the Next.js web application and database first; trigger browser automation within Next.js API routes or serverless background workers.
2. **Option 2: Parallel Hybrid**
   Develop the CLI and Web App simultaneously, sharing common utility functions.
3. **Option 3: Engine-First Architecture (Chosen)**
   Build the scanner as an independent, standalone TypeScript engine package. The engine accepts a target URL and configuration, executes browser automation, runs checks, and emits a strictly schema-validated JSON/Markdown report. The CLI is the primary first-class consumer. The Web UI and GitHub Action act as thin wrappers around this engine.

---

## Decision Outcome

**Chosen Option: Option 3 (Engine-First Architecture).**

### Architectural Specifics:
1. The scanning engine lives in `packages/core`, `packages/checks`, and `packages/schema`. It has zero dependencies on web frameworks (Next.js), ORMs (Drizzle), or databases (PostgreSQL).
2. All inputs (configuration) and outputs (reports, findings, evidence) are formally defined using Zod schemas in `packages/schema`.
3. The CLI (`packages/cli`) is the initial entry point, consuming the engine directly to produce local artifacts (`report.json`, `report.md`).
4. The Web App (`apps/web`) will interact with the engine via an explicit `Runner` abstraction (spawning either a local process or a remote job), consuming the same JSON report via standardized callback mechanisms.

---

## Consequences

### Positive Consequences
- **Maximum Portability:** The engine can run on local developer machines, GitHub Actions runners, Docker containers, or cloud compute instances without modification.
- **Superior Testability:** Unit tests, integration tests against fixture sites, and benchmark mutator runs execute directly against the engine library in milliseconds without spinning up web servers or database migrations.
- **Clean Dependency Graph:** Prevents accidental leakage of web-specific dependencies (Next.js, React, Auth.js) into the core scanning logic.
- **Early Release Milestone:** Enables shipping **Release A (CLI + Benchmark)** early to demonstrate working functionality and open-source credibility before building the Web MVP.

### Trade-offs & Mitigations
- **Runner Abstraction Overhead:** The Web App cannot execute scans in-process; it requires an explicit `Runner` interface (`LocalProcessRunner` and `GitHubActionsRunner`) and signed callback endpoints.
  *Mitigation:* This boundary enforces strong security isolation, ensuring untrusted web page scanning occurs in a sandboxed process separate from the Web API server and its database secrets.
