---
name: tracegate-mcp
description: Mandatory pre-flight compliance and evidence-gate check via TraceGate Atlassian MCP before modifying regulated components or transitioning Jira releases.
---

# TraceGate Governance Skill (Atlassian MCP)

When working in a repository connected to a regulated Jira + Confluence project protected by **TraceGate**, NEVER transition a release ticket or approve a safety-critical change without validating the live evidence graph.

## Workflow

1. **Phase 1 — Evaluate (`evaluate-release-gate`)**
   - Call `evaluate-release-gate` on the connected Atlassian MCP server.
   - Inspect `verdict` (`ALLOW`, `NEEDS_REVIEW`, or `BLOCK`), `confidenceScore`, and `evidenceFingerprint`.
   - If `verdict === "BLOCK"`, STOP immediately.

2. **Inspect Clause Drift & Blast Radius (`inspect-evidence-diff`)**
   - Call `inspect-evidence-diff` to retrieve exact line/parameter differences between the QA-certified baseline and live Confluence/Jira content (e.g., `Max Single Bolus Limit: 10U -> 15U`) and every downstream `SUSPECT` test or FMEA hazard.
   - Surface the exact `provenancePath` and remediation steps to the engineer.

3. **Create Remediation or Request Independent QA Co-Sign (`create-remediation-tasks`)**
   - Call `create-remediation-tasks` to log Jira follow-up tickets for missing or stale verifications.
   - Remember **Segregation of Duties**: the author who edited a specification cannot self-certify QA sign-off.

4. **Phase 2 — Governed Commit (`commit-governed-release`)**
   - Only when `verdict === "ALLOW"`, call `commit-governed-release` with the `expectedFingerprint` from Phase 1.
   - TraceGate atomically re-reads live Atlassian evidence before executing the Jira transition and seals the receipt in its SHA-256 hash-chained audit ledger.
