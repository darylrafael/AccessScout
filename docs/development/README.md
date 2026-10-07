# AccessScout — Developer & Engineering Workflow Guide

> This guide establishes the operational standards, local environment setup, and engineering discipline required for developing AccessScout.

---

## 1. Prerequisites & Tooling

To ensure deterministic builds across all developer environments:
- **Node.js:** Modern LTS (v20+ recommended).
- **Package Manager:** `pnpm` (v9+). Do not use `npm` or `yarn`.
- **Browser Automation:** Playwright CLI (`pnpm exec playwright install chromium`).
- **Operating System:** Tested on Windows (PowerShell/cmd) and Linux/macOS.

---

## 2. Engineering Discipline & Cycle

Every unit of work must strictly follow the **9-Stage Engineering Discipline**:

```
1. UNDERSTAND   Review specifications, requirements, and constraints.
2. PLAN         Produce actionable task breakdown, list touched files & dependencies.
3. LEARN        Explain what is being built, why, engineering tradeoffs, and learning points.
4. IMPLEMENT    Write clean, type-safe, minimal code for the current milestone only.
5. TEST         Write comprehensive unit, integration, and baseline regression tests.
6. DEMONSTRATE  Execute commands, display terminal outputs, screenshots, or logs.
7. REVIEW       Inspect code quality, linting, type-safety, and security constraints.
8. APPROVE      Obtain explicit stakeholder/owner approval before proceeding.
9. NEXT         Advance to the next milestone.
```

### The Incremental Evolution Rule
- **Never create speculative packages.** Only initialize a package or folder when the current phase requires it or when an essential architectural boundary must be established.
- **Never commit placeholder mocks.** Mocking out functions with `TODO: implement later` and claiming a feature is complete is strictly prohibited.
- If code exists, tests must exist. If tests do not exist, the feature is `NOT DONE`.

---

## 3. Git Workflow & Commit Conventions

### Branching Strategy
- **`main`:** Production-grade trunk. Must remain green and deployable at all times.
- **`feat/<phase-or-feature>`:** Active development branches (e.g., `feat/phase-0-bootstrap`, `feat/keyboard-trap-k002`).
- **`fix/<issue-name>`:** Bug fix branches.
- **`chore/<task>`:** Tooling, dependency updates, and maintenance.

### Conventional Commits
All commits must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <short description>

[optional body explaining WHAT was changed and WHY]
[optional footer(s)]
```

#### Allowed Types:
- `feat`: New feature or check implementation.
- `fix`: Bug fix in scanning engine, parser, or runner.
- `test`: Adding or refactoring test suites, mutators, or fixtures.
- `docs`: Documentation updates, ADR additions, README changes.
- `chore`: Tooling configuration, dependency bumps, CI changes.
- `refactor`: Code changes that neither fix a bug nor add a feature.

#### Examples:
```bash
feat(checks): implement keyboard trap detection check K-002
test(eval): add mutator M06 for focus indicator removal
docs(adr): record ADR-0001 engine-first architectural decision
```

---

## 4. Verification & Quality Gates

Before any pull request can be merged or milestone declared complete, the following four gates must pass with zero errors:

```bash
# 1. Code Style & Linting
pnpm lint

# 2. Strict Type Checking across all workspace packages
pnpm typecheck

# 3. Automated Unit & Integration Tests
pnpm test

# 4. Fast Benchmark Regression Suite
pnpm eval:smoke
```

### Protection of Ground-Truth Fixtures
- All files under `fixtures/expected/**` and `fixtures/judgments/**` define the evaluation ground truth.
- These files are protected by `.github/CODEOWNERS`.
- Any modification to expected benchmark outcomes must include written technical justification and owner approval.

---

## 5. Architectural Decision Records (ADRs)

Whenever a significant technical decision is made that impacts system architecture, dependencies, or security boundaries:
1. Create a new markdown file under `docs/adr/` with the naming convention:
   `docs/adr/NNNN-<slug>.md` (e.g., `0001-engine-first.md`).
2. Follow the standard ADR structure:
   - **Title & Status** (Proposed, Accepted, Rejected, Deprecated).
   - **Context & Problem Statement**.
   - **Decision Drivers**.
   - **Considered Options**.
   - **Decision Outcome & Specifics**.
   - **Consequences (Pros, Cons, Tradeoffs)**.
