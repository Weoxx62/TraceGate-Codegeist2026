# TraceGate — Codegeist 2026 Submission Dossier

> **Prepared for `https://codegeist2026.devpost.com/`**

---

## 1. Devpost Core Project Fields

- **Project Name (`<= 60` chars)**: `TraceGate — Deterministic Compliance & MCP Gate` *(47 chars)*
- **Elevator Pitch / Tagline (`<= 200` chars)**: `Cryptographic SHA-256 spec drift detection, FMEA blast-radius lineage, and a Two-Phase Commit Atlassian MCP gate so regulated teams and AI agents ship with confidence.` *(168 chars)*
- **Built With (`16` tags)**:
  `atlassian-forge`, `jira`, `confluence`, `rovo`, `rovo-mcp`, `forge-sql`, `forge-kvs`, `custom-ui`, `typescript`, `react`, `vite`, `vitest`, `sha-256`, `iec-62304`, `dora`, `iso-26262`
- **Project Links**:
  - **Live 0-Login Interactive Studio (GitHub Pages)**: `https://weoxx62.github.io/TraceGate-Codegeist2026/`
  - **Public Source Code (`Apache-2.0`)**: `https://github.com/Weoxx62/TraceGate-Codegeist2026`
  - **Judge Forge Installation Link (Jira + Confluence)**:
    `https://developer.atlassian.com/console/install/22b1d3e6-dd70-464e-9fad-f148139c4479?signature=AYABeILgu38WqOOzXNkneioxWLcAAAADAAdhd3Mta21zAEthcm46YXdzOmttczp1cy13ZXN0LTI6NzA5NTg3ODM1MjQzOmtleS83MDVlZDY3MC1mNTdjLTQxYjUtOWY5Yi1lM2YyZGNjMTQ2ZTcAuAECAQB4CxqLTo9l4lqXuFjNim1xJM%2Bp%2F3TVP9xHS2BrU5DRRucBuSaDCo7msreL7NAD3aPVEQAAAH4wfAYJKoZIhvcNAQcGoG8wbQIBADBoBgkqhkiG9w0BBwEwHgYJYIZIAWUDBAEuMBEEDAAgcHEijxWFyUf1GgIBEIA7oPnSeDKuxlfJzrhKmKNNCU1pxHkIzw%2FFl7UmoeJgpgT8aBVZrg7RUS68lCI02In%2FYdDQJCGVRonqdrQAB2F3cy1rbXMAS2Fybjphd3M6a21zOmV1LXdlc3QtMTo3MDk1ODc4MzUyNDM6a2V5LzQ2MzBjZTZiLTAwYzMtNGRlMi04NzdiLTYyN2UyMDYwZTVjYwC4AQICAHi9bVMAkme4qVQX1fQHo6ePw3H40A7cGfz7yrmSfBWMXgHH4EGTAWC6bKgwcC7rR8nJAAAAfjB8BgkqhkiG9w0BBwagbzBtAgEAMGgGCSqGSIb3DQEHATAeBglghkgBZQMEAS4wEQQMaobHA4B7SY9KfzE4AgEQgDuZ4oibG8PQlVqlojKmpxiuHb9puMW9CVD6SCLrhA1dmHW3kx3evzskgL7RbmqvVXGg4bCwux67peNw8wAHYXdzLWttcwBLYXJuOmF3czprbXM6dXMtZWFzdC0xOjcwOTU4NzgzNTI0MzprZXkvNmMxMjBiYTAtNGNkNS00OTg1LWI4MmUtNDBhMDQ5NTJjYzU3ALgBAgIAeDYASx0XCjkny4iLV6vz%2BKtEGSGT6kdt0QRpkn6D%2FlVEAZsoMqfOIckrWkBloTK33zIAAAB%2BMHwGCSqGSIb3DQEHBqBvMG0CAQAwaAYJKoZIhvcNAQcBMB4GCWCGSAFlAwQBLjARBAwQgQWl03Tk6oy%2BwQMCARCAOwlIVD3S9IplIHeFBaIvhW7q6QMU1W9%2B1Qkld08qEjCi8TyBzMB%2FcmJBnHjl0pdZraCiWLiEF8iPbK9gAgAAAAAMAAAQAAAAAAAAAAAAAAAAALLha3EShxJAX9NhVdgWa8b%2F%2F%2F%2F%2FAAAAAQAAAAAAAAAAAAAAAQAAADLpIdS1I16P5aFSW33Akl1SPHn6Ingb%2FuEfshaJKfTAFFPU52d2%2Fm30ceSyZCMUh%2BO%2BaQzN4uAH7QI9%2BT1CZ%2F1rFfU%3D&product=jira&product=confluence`

---

## 2. Full Devpost Project Story

### Inspiration — Silent Spec Drift & Autonomous Agents in Regulated Engineering

In regulated industries—medical devices (**IEC 62304 / FDA 21 CFR Part 11**), financial clearing (**EU DORA / SOC2**), and automotive safety (**ISO 26262 ASIL-D**)—product safety rules live in **Confluence**, requirements, FMEA hazards, and verification tests live in **Jira**, and code or release workflows are increasingly triggered by **AI coding agents and Rovo** via **Model Context Protocol (MCP)**.

Consider three real-world failure modes:
1. **MedTech (IEC 62304 Class C)**: An engineer raises `Max Single Bolus Limit` in a Confluence SOP from `10U` to `15U` *after* QA already certified the bench tests in Jira (`MED-401`, `MED-403`).
2. **FinTech (EU DORA)**: An ICT settlement policy changes the AML circuit-breaker ceiling from `EUR 10000` to `EUR 50000` after risk sign-off.
3. **Automotive (ISO 26262 ASIL-D)**: An ADAS braking latency budget drifts from `<= 45ms` to `<= 85ms` while upstream HIL tests still read `PASSED`.

Traditional Jira workflows only check whether a ticket status says `Done`—they cannot tell that an upstream Confluence specification mutated cryptographically, let alone stop an autonomous MCP agent from transitioning a release during a mid-flight edit race.

We built **TraceGate** to act as a **deterministic compliance flight recorder and Two-Phase Commit gate natively inside Atlassian Forge**, with **zero external LLM calls** and **zero external network egress** (*Runs on Atlassian*).

---

### What TraceGate Does

TraceGate turns connected Jira, Confluence, Risk, Code, and Release evidence into a **cryptographically verified Release Gate**:

1. **Semantic ADF / HTML / Markdown Canonicalization (`0` False Positives)**
   - Extracts clean canonical clause text from Confluence Atlassian Document Format (ADF) JSON, HTML, or Markdown and computes RFC 6234 **SHA-256 digests**.
   - Cosmetic edits (extra spaces, Markdown bolding, trailing punctuation) preserve the exact same SHA-256 hash—zero alert fatigue.
   - Real normative edits (`10U -> 15U`) trigger **key-aligned + LCS semantic clause diffing** (`[CLAUSE-BOLUS-01]`) with token-level inline highlighting even if lines are inserted above existing clauses.

2. **Transitive Blast Radius & Hop-Attenuated FMEA Risk (`graphEngine.ts`)**
   - Uses **3-color DFS cycle detection** and bounded **BFS lineage propagation** from any drifted specification or stale verification test.
   - Automatically reconciles downstream Jira requirements, FMEA hazards (Severity × Occurrence × Detection RPN), verification tests, and build artifacts to `SUSPECT` and locks the Jira Release Gate (`BLOCK`).

3. **5 Deterministic Policy Predicates & Segregation of Duties**
   - `GRAPH_CYCLE_CHECK`: Guarantees an acyclic traceability DAG.
   - `HASH_DRIFT_CHECK`: Requires every certified spec baseline to match its live SHA-256 digest.
   - `SUSPECT_LINK_PROPAGATION`: Blocks releases with any downstream suspect artifact.
   - `TRACEABILITY_COMPLETENESS`: Ensures high-RPN FMEA hazards (`RPN >= 100`) have valid, non-suspect mitigating tests.
   - `EVIDENCE_FRESHNESS` & `SEGREGATION_OF_DUTIES`: Blocks self-approval (`SOD_VIOLATION_BLOCKED`) whenever the actor who modified a drifted spec tries to certify QA sign-off—requiring independent Lead QA co-signature.

4. **Two-Phase Commit Firewall for Rovo & External MCP Agents (`OWASP LLM06`)**
   - Agents cannot blindly approve or release work.
   - **Phase 1 (`evaluate-release-gate`)** returns the 64-char SHA-256 `evidenceFingerprint` computed over sorted nodes, versions, statuses, approvers, and edges.
   - **Phase 2 (`commit-governed-release`)** strictly requires `expectedFingerprint` and aborts (`COMMIT_REJECTED_EVIDENCE_CHANGED`) if the fingerprint is missing, forged, or mutated between evaluate and commit.

5. **Hash-Chained Audit Ledger + Regulator Evidence Pack (`.md` & Printable `.html`)**
   - Every seeding event, spec drift, SoD violation block, MCP tool invocation, QA co-signature, and release commit is sealed into an immutable **genesis-anchored SHA-256 hash chain** (`verifyLedgerChain` detects single-character tampering at any index).
   - Exports a Markdown **Audit Evidence Pack** (with automatic table pipe escaping), publishes directly to **Confluence**, or downloads a self-contained, print-ready **HTML Regulatory Certificate** (`Print / Save as PDF`).

6. **Cross-Product Native Surfaces & Switchable Industry Baselines**
   - **3 Pre-Built Regulated Baselines**: MedTech (`IEC 62304 / FDA`), FinTech (`EU DORA / SOC2`), Automotive (`ISO 26262 ASIL-D`).
   - **3-Pane Obsidian/Light Compliance Studio (`jira:globalPage`)** with causal hover isolation on the SVG Evidence Lineage graph, live Spec Editor, inline diff viewer, `Ctrl+K` Command Palette, and slide-over Fault Lab.
   - **Jira Issue Panel (`jira:issuePanel`)** + **Jira Workflow Validator (`jira:workflowValidator`)** + **Confluence Content Byline (`confluence:contentBylineItem`)** + real-time **Confluence/Jira Triggers**.

---

### How We Built It on Atlassian Forge

- **Zero External Egress (*Runs on Atlassian* Eligible)**: All hashing, graph analysis, policy evaluation, and Custom UI rendering run strictly within Atlassian's Forge Node.js 22 runtime (`nodejs22.x`) and static Custom UI assets (`vite` + `react` + `typescript` strict mode, zero external fonts or CDNs).
- **Persistence (`@forge/sql` + `@forge/kvs`)**:
  - Relational schema (`tg_meta`, `tg_nodes`, `tg_edges`, `tg_ledger`) provisioned via `migrationRunner` with parameterized queries, batched node/edge writes, and **O(1) incremental append** for immutable `tg_ledger` entries—backed by `@forge/kvs` fallback.
- **Atlassian Cloud Integration**:
  - **Jira REST v3**: Creates real linked requirements/hazard/test/release issues (`Seed Workspace`), injects direct `Open in Jira ↗` deep links, creates remediation tasks (`create-remediation-tasks`), and enforces release transition gating (`validateReleaseTransition`).
  - **Confluence REST v2**: Publishes and reads live `atlas_doc_format` SOP pages (`syncLiveAtlassianNodes`), exposes status directly in the Confluence Content Byline (`TraceGate Spec Status`), and publishes complete Audit Evidence Packs to Confluence spaces.
  - **Rovo + Atlassian MCP**:
    - `rovo:mcp` (`tracegate-mcp-server`) exposes 4 deterministic `action` modules (`evaluate-release-gate`, `inspect-evidence-diff`, `create-remediation-tasks`, `commit-governed-release`).
    - `rovo:skill` (`skills/tracegate-mcp/SKILL.md`) gives third-party coding agents (Claude Code, Cursor, Codex) the exact Two-Phase governance workflow.
    - `rovo:agent` (`TraceGate Compliance Auditor`) enforces strict zero-hallucination evidence rules directly inside Rovo Chat.

---

### Challenges We Ran Into

1. **Preventing Mid-Flight Race Conditions & Agent Bypass (`OWASP LLM06`)**: Initially, a caller could invoke a release commit without proving it inspected the latest graph digest. We hardened both the `commit-governed-release` action (`required: true` 64-char SHA-256 `expectedFingerprint`) and the UI/backend resolver boundary so missing or stale digests are deterministically rejected before touching Jira.
2. **Eliminating False Positives on Line Insertions in Confluence**: Positional line-by-line diffing breaks when an author inserts an editorial note at the top of a Confluence SOP, shifting every clause index below it. We replaced this with explicit clause-key alignment + an LCS aligner for unkeyed prose lines (`computeClauseDiffs`).
3. **Resolving Forge Custom UI Context Outside Host Iframes**: Top-level `@forge/bridge` imports throw `BridgeAPIError` in standalone demos. Lazy dynamic imports guarded by `globalThis.__bridge?.callBridge` allow the exact same Custom UI bundle to work both live inside Jira/Confluence and as a zero-login interactive judge preview on GitHub Pages.

---

### Accomplishments We're Proud Of

- **Full Atlassian Stack Integration** across **Jira**, **Confluence**, **Rovo Agent**, **Rovo Skill**, **Atlassian MCP (`rovo:mcp`)**, **Forge SQL**, and **Forge KVS**—deployed cleanly to Forge `production` with *Runs on Atlassian* zero-egress eligibility.
- **21 Automated Unit & Security Tests (Vitest)** covering RFC 6234 SHA-256 hashing, cosmetic edit immunity, key-aligned diffs, cyclic BFS protection, Segregation of Duties, Two-Phase Commit abort on drift, ledger tamper detection, input boundary validation, and Markdown/HTML injection escaping.
- **Crafted Linear/Raycast-Inspired 3-Pane Studio UI** with progressive disclosure (`Fault Lab` drawer), `Ctrl+K` Command Palette, causal path hover isolation, and token-level inline diffs.

---

### What's Next for TraceGate

- **Bitbucket & Compass Code-Artifact Webhooks**: Automatically bind signed build digests and SBOM attestations to stage 4 (`Artifact`) nodes when CI/CD pipelines finish.
- **Teamwork Graph API Connector**: Publish verified release attestation edges into Atlassian Teamwork Graph for org-wide audit visibility.
- **Atlassian Marketplace Listing**: Package multi-project workspace isolation (`workspaceKey` partitioning) and scheduled regulator archival exports.

---

## 3. Codegeist 2026 Custom Submission Form Answers

| Field ID | Question | Answer to Enter |
| :---: | :--- | :--- |
| `29385` | **Submitter Type** | `Individual` |
| `29386` | **Submitter Country of Residence** | `France` |
| `29387` | **Canadian Province** | `N/A` |
| `29388` | **Organization Name** | `N/A` |
| `29390` | **What date did you start this project?** | `2026-11-24` |
| `29389` | **Is your project new, or did it exist before October 27, 2026?** | `New` |
| `29392` | **Installation Link URL** | *(See official signed installation URL in Section 1)* |
| `29393` | **Testing Instructions for Judges** | **Option A — Test Live inside Atlassian Cloud (Jira + Confluence + Rovo):**<br>1. Click our Installation Link and install **TraceGate** on your Jira & Confluence site.<br>2. Open **Apps -> TraceGate** in Jira. Notice the pre-loaded MedTech (`IEC 62304`) drift scenario (`CONF-SOP-204` changed `10U -> 15U`, marking 6 downstream artifacts `SUSPECT`/`BLOCKED`). Switch presets in the left sidebar (`FinTech EU DORA` or `Automotive ISO 26262`).<br>3. Click a node in the SVG Evidence Lineage graph and test **Format-Only Test** (proves `0` false positives) vs **Fault Lab -> Test Self-Approval** (`SOD_VIOLATION_BLOCKED`), **Test Commit Race** (`COMMIT_REJECTED_EVIDENCE_CHANGED`), and **Co-Sign as Lead QA -> Commit Release**.<br>4. Open **Fault Lab -> Live Atlassian Environment -> Seed Workspace** to create real linked Jira issues and a Confluence SOP page on your site. Open the seeded release issue to inspect **TraceGate Evidence Gate** (`jira:issuePanel`), edit the seeded Confluence page directly to watch live SHA-256 drift detection + **TraceGate Spec Status** (`confluence:contentBylineItem`), and ask **TraceGate Compliance Auditor** in **Rovo Chat**.<br>5. Open **MCP & Agents** to invoke `evaluate-release-gate`, `inspect-evidence-diff`, `commit-governed-release`, and `test-unverified-commit` (OWASP LLM06 attack test). Open **Audit Ledger** to verify the SHA-256 chain and export `.md` / `.html` compliance reports.<br><br>**Option B — Instant 0-Login Interactive Preview:** `https://weoxx62.github.io/TraceGate-Codegeist2026/` |
| `29394` | **App ID located in the Developer Console** | `22b1d3e6-dd70-464e-9fad-f148139c4479` (`ari:cloud:ecosystem::app/22b1d3e6-dd70-464e-9fad-f148139c4479`) |
| `29395` | **Explain how your project meets the main technology requirement** | Built on **Atlassian Forge** (`nodejs22.x`, *Runs on Atlassian* zero external egress) integrating:<br>- **Jira** (`jira:globalPage`, `jira:issuePanel`, `jira:workflowValidator`, Jira REST API v3 issue creation, linking, commenting, and workflow transition gating).<br>- **Confluence** (`confluence:contentBylineItem`, Confluence REST API v2 `atlas_doc_format` SOP synchronization, Audit Pack page publishing, and `avi:confluence:updated:page` drift trigger).<br>- **Rovo & Atlassian MCP** (`rovo:mcp`, `rovo:skill`, `rovo:agent`, and 4 `action` modules enforcing Two-Phase Commit governance).<br>- **Forge Storage** (`@forge/sql` MySQL schema with batched writes & O(1) incremental ledger append + `@forge/kvs` fallback). |
| `29396` | **Which Category are you submitting your project into?** | `Apps for Specialized Industries` |
| `29397` | **Please explain why you chose the above track** | Regulated industries—medical devices (IEC 62304 / FDA 21 CFR Part 11), financial clearing (EU DORA / SOC2), and automotive functional safety (ISO 26262 ASIL-D)—require cryptographically verifiable Requirements Traceability Matrices (RTM), FMEA RPN hazard coverage, Segregation of Duties, and tamper-evident audit trails. TraceGate ships with switchable templates and compliance predicates purpose-built for those specialized regulated teams. |
| `29398` | **Which Bonus Prize are you submitting your project into?** | `Best app with Atlassian MCP` |
| `29447` | **Experience building with Forge** | **Worked well:** `rovo:mcp` + `rovo:skill` + `rovo:agent` sharing the same typed `action` modules in `manifest.yml` is clean and practical; `@forge/sql` with `migrationRunner` let us model relational evidence nodes, edges, and an append-only hash ledger cleanly with zero external database hosting; Custom UI `Runs on Atlassian` zero-egress guarantees map well to regulated customer security reviews.<br>**Friction & improvements:** `@forge/cli` currently requires Node 22/24/26 while rejecting Node 25, and importing `@forge/bridge` at module top level throws immediately outside host iframes (lazy-loading `@forge/bridge` solved standalone browser testing). Stronger local mocking for `rovo:mcp` + `@forge/sql` inside `forge tunnel` would further accelerate developer iteration. |
| `29448` | **Which AI tools have you leveraged while working on this project?** | Used **Antigravity (AI coding assistant)** during engineering for TypeScript architecture review, Vitest security/edge-case test authoring, and UI layout refinement. TraceGate's production runtime inside Forge is **100% deterministic with zero external LLM API calls**, delegating natural-language Q&A cleanly to the native **Rovo Agent** (`TraceGate Compliance Auditor`). |
| `29449` | **How much did this hackathon help you develop new skills?** | `Significantly` |
| `29450` | **How likely are you to use Forge/Atlassian again?** | `Very likely` |
| `29451–29453` | **Eligibility Checkboxes (Age, Jurisdiction, Employee)** | *(Confirm with Julien before submitting)* |

---

## 4. Visual Assets Ready for Devpost Upload

1. **Project Thumbnail (`1200×800`)**: `docs/screenshots/devpost-thumbnail.png`
2. **Gallery Screenshot 1**: `docs/screenshots/01-studio-dark-drift.png` — *3-Pane Obsidian Studio catching live Confluence SHA-256 drift (`10U -> 15U`) and blocking downstream artifacts*
3. **Gallery Screenshot 2**: `docs/screenshots/02-studio-certified-light.png` — *Independent QA Co-Sign restoring 100% Ship-Confidence (`ALLOW`) in Light Paper mode*
4. **Gallery Screenshot 3**: `docs/screenshots/03-issue-panel-inline-diff.png` — *Native Jira Issue Panel (`jira:issuePanel`) with token-level clause diff and Segregation of Duties controls*
5. **Gallery Screenshot 4**: `docs/screenshots/04-confluence-byline-status.png` — *Native Confluence Content Byline (`confluence:contentBylineItem`) displaying live SOP digest and Jira blast radius*
6. **Gallery Screenshot 5**: `docs/screenshots/05-mcp-explorer.png` — *Atlassian MCP Explorer (`rovo:mcp`), `SKILL.md` template, and OWASP LLM06 unverified-commit firewall check*
