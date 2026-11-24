# Security Policy & Architecture — TraceGate

TraceGate is designed for regulated engineering environments and follows strict **Runs on Atlassian** isolation, **OWASP Top 10**, and **OWASP Top 10 for LLM Applications** security boundaries.

---

## 1. Execution & Network Boundary (*Runs on Atlassian*)

- **Zero external egress**: [manifest.yml](./manifest.yml) declares **no external fetch permissions or egress domains**. All evaluation, normalization, SHA-256 hashing, policy checks, and ledger signing execute strictly inside Atlassian's Forge runtime (`nodejs22.x`).
- **Zero external LLM dependencies**: Compliance verdicts (`ALLOW` / `NEEDS_REVIEW` / `BLOCK`), `ClauseDiff` extraction, FMEA risk scores, and Two-Phase Commit checks are 100% deterministic TypeScript functions in `src/core/`.

---

## 2. STRIDE & OWASP Controls

| Category | Mitigation in TraceGate |
| :--- | :--- |
| **Input & Size Validation (`A03` / `LLM10`)** | [src/backend/validation.ts](./src/backend/validation.ts) enforces project-key allowlists, Confluence space ID formats, node-ID membership checks, `16 KB` (`16,384` char) payload caps, and strips NUL/control bytes across all Forge resolver endpoints and Rovo/MCP actions. |
| **SQL Injection Prevention (`A03`)** | All persistence in [src/backend/persistence/store.ts](./src/backend/persistence/store.ts) uses parameterized `@forge/sql` prepared statements (`sql.prepare(...).bindParams(...)`) with tenant-scoped Forge storage isolation. |
| **AI Agent & MCP Excessive Agency (`LLM06`)** | `commit-governed-release` in [src/backend/actions/mcpAndRovoActions.ts](./src/backend/actions/mcpAndRovoActions.ts) strictly requires a valid 64-character SHA-256 `expectedFingerprint` obtained from Phase 1 (`evaluate-release-gate`). Missing or stale digests abort immediately with `COMMIT_REJECTED_EVIDENCE_CHANGED` and log a cryptographic audit event. |
| **Segregation of Duties (`A01`)** | `SEGREGATION_OF_DUTIES` blocks any spec modifier from self-certifying QA approval of their own change. |
| **Prompt Injection Resilience (`LLM01`)** | Even if a Confluence SOP contains adversarial instructions, deterministic ADF/HTML canonicalization and policy evaluation ignore natural-language directives and evaluate only cryptographic hashes, DAG edges, and timestamps. |
| **Tamper-Evident Audit Ledger** | [src/core/auditLedger.ts](./src/core/auditLedger.ts) chains every event with `SHA256(prevHash | timestamp | canonicalPayload)` verifiable at runtime. |
| **Safe Error Handling (`A05`)** | Resolver entry points sanitize unexpected internal exceptions via `toSafeErrorMessage` so internal SQL schemas or stack traces are never returned to callers. |

---

## 3. Supply-Chain & Dependency Audit Hygiene

- Production runtime dependencies (`@forge/api`, `@forge/kvs`, `@forge/resolver`, `@forge/sql`) are pinned through a single authoritative `package-lock.json` verified via `npm ci` in GitHub Actions.
- Pre-release dependency triage (`npm audit --omit=dev`): any transitive advisories reported under `@forge/manifest` (`glob` / `minimatch`) affect build/manifest tooling rather than runtime user-supplied glob paths; browser/React UI bundles ship zero `@forge/sql`/`@forge/api` runtime code.

---

## 4. Reporting a Vulnerability

If you discover a security issue, please email **Julien Taverne** at [julientaverne62@gmail.com](mailto:julientaverne62@gmail.com) rather than posting exploit details in public issues.
