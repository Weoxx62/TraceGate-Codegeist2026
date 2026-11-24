import type {
  EvaluationResult,
  EvidenceGraphSnapshot,
  LedgerVerificationResult,
} from './types';

/**
 * Escapes characters that could break Markdown tables or inject newlines into rows.
 */
export function escapeMarkdownCell(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/[\r\n]+/g, ' ')
    .trim();
}

/**
 * Escapes HTML special characters for safe embedding inside downloadable reports.
 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Generates a regulator-ready Markdown Audit Evidence Pack containing the
 * SHA-256 release fingerprint, Requirements Traceability Matrix (RTM),
 * detected clause drifts, policy findings, and hash-chained ledger proof.
 */
export function generateAuditPackMarkdown(
  snapshot: EvidenceGraphSnapshot,
  evaluation: EvaluationResult,
  ledgerVerification: LedgerVerificationResult,
): string {
  const lines: string[] = [
    `# TraceGate Audit Evidence Pack — ${snapshot.scenarioTitle}`,
    '',
    `- **Industry Preset**: \`${snapshot.industryPreset ?? 'MEDTECH_IEC62304'}\``,
    `- **Policy Baseline**: \`${snapshot.policy.version}\``,
    `- **Evaluated At**: \`${evaluation.evaluatedAt}\``,
    `- **Release Verdict**: **${evaluation.verdict}** (**${evaluation.confidenceScore}%** Ship-Confidence)`,
    `- **Evidence Fingerprint (SHA-256)**: \`${evaluation.evidenceFingerprint}\``,
    `- **Audit Ledger Chain Integrity**: **${ledgerVerification.valid ? 'VERIFIED INTACT' : 'BROKEN'}** (${ledgerVerification.totalEntries} entries)`,
    `- **FMEA Blast Exposure**: \`${evaluation.fmeaExposureTotal}\` (${evaluation.blastRadius.length} impacted artifacts)`,
    '',
    '## 1. Requirements & Artifact Traceability Matrix (RTM)',
    '',
    '| Node ID | External ID | Pillar | Status | Version | Live Hash (SHA-256) | QA Certified By |',
    '| :--- | :--- | :--- | :--- | :---: | :--- | :--- |',
    ...snapshot.nodes.map(
      (n) =>
        `| \`${escapeMarkdownCell(n.id)}\` | \`${escapeMarkdownCell(n.externalId)}\` | ${escapeMarkdownCell(n.pillar)} | **${escapeMarkdownCell(n.status)}** | v${n.version} | \`${escapeMarkdownCell(n.liveHash.slice(0, 16))}\` | ${escapeMarkdownCell(n.approvedBy ?? 'Pending')} |`,
    ),
    '',
  ];

  if (evaluation.clauseDiffs.length > 0) {
    lines.push('## 2. Cryptographic Specification Drift (Approved vs Live)', '');
    for (const diff of evaluation.clauseDiffs) {
      lines.push(
        `- **${escapeMarkdownCell(diff.externalId)} [${escapeMarkdownCell(diff.clauseKey)}]**`,
        `  - Approved QA Baseline: \`${escapeMarkdownCell(diff.approvedLine ?? 'N/A')}\``,
        `  - Live Content: \`${escapeMarkdownCell(diff.liveLine ?? 'N/A')}\``,
      );
    }
    lines.push('');
  }

  lines.push('## 3. Deterministic Policy Findings', '');
  if (evaluation.blockers.length === 0) {
    lines.push('All 5 deterministic compliance predicates passed with zero blockers.', '');
  } else {
    for (const b of evaluation.blockers) {
      lines.push(
        `- **[BLOCKER · ${escapeMarkdownCell(b.code)}] ${escapeMarkdownCell(b.externalId)}**: ${escapeMarkdownCell(b.message)} *(Remediation: ${escapeMarkdownCell(b.remediation)})*`,
      );
    }
    lines.push('');
  }

  lines.push(
    '## 4. Hash-Chained Audit Ledger Proof',
    '',
    '| # | Timestamp | Event | Actor | Verdict | Entry Hash |',
    '| :---: | :--- | :--- | :--- | :---: | :--- |',
    ...snapshot.ledger.map(
      (e) =>
        `| ${e.index} | \`${escapeMarkdownCell(e.timestamp)}\` | \`${escapeMarkdownCell(e.payload.eventType)}\` | ${escapeMarkdownCell(e.payload.actorId)} | ${escapeMarkdownCell(e.payload.verdict)} | \`${escapeMarkdownCell(e.entryHash.slice(0, 16))}\` |`,
    ),
    '',
  );

  return lines.join('\n');
}

/**
 * Generates a self-contained, zero-egress, print-ready HTML regulatory certificate
 * suitable for browser Save-as-PDF inspection in regulated audits (IEC 62304 / DORA / ISO 26262).
 */
export function generateAuditCertificateHtml(
  snapshot: EvidenceGraphSnapshot,
  evaluation: EvaluationResult,
  ledgerVerification: LedgerVerificationResult,
): string {
  const verdictTone =
    evaluation.verdict === 'ALLOW'
      ? '#059669'
      : evaluation.verdict === 'NEEDS_REVIEW'
        ? '#d97706'
        : '#dc2626';

  const rtmRows = snapshot.nodes
    .map(
      (n) => `<tr>
        <td><code>${escapeHtml(n.id)}</code></td>
        <td><code>${escapeHtml(n.externalId)}</code></td>
        <td>${escapeHtml(n.pillar)}</td>
        <td><strong>${escapeHtml(n.status)}</strong></td>
        <td>v${n.version}</td>
        <td><code>${escapeHtml(n.liveHash.slice(0, 16))}</code></td>
        <td>${escapeHtml(n.approvedBy ?? 'Pending')}</td>
      </tr>`,
    )
    .join('\n');

  const diffBlock =
    evaluation.clauseDiffs.length === 0
      ? '<p class="ok">Zero specification drift detected against QA-certified SHA-256 baselines.</p>'
      : evaluation.clauseDiffs
          .map(
            (d) => `<div class="diff-card">
              <div class="diff-head">${escapeHtml(d.externalId)} · <code>${escapeHtml(d.clauseKey)}</code> (${escapeHtml(d.changeType)})</div>
              <div class="diff-old">- Approved: ${escapeHtml(d.approvedLine ?? 'N/A')}</div>
              <div class="diff-new">+ Live: ${escapeHtml(d.liveLine ?? 'N/A')}</div>
            </div>`,
          )
          .join('\n');

  const findingsBlock =
    evaluation.blockers.length === 0
      ? '<p class="ok">All 5 deterministic compliance predicates passed with 0 blockers.</p>'
      : `<ul>${evaluation.blockers
          .map(
            (b) =>
              `<li><strong>[${escapeHtml(b.code)}] ${escapeHtml(b.externalId)}:</strong> ${escapeHtml(b.message)} <em>(Remediation: ${escapeHtml(b.remediation)})</em></li>`,
          )
          .join('')}</ul>`;

  const ledgerRows = snapshot.ledger
    .map(
      (e) => `<tr>
        <td>#${e.index}</td>
        <td><code>${escapeHtml(e.timestamp)}</code></td>
        <td><code>${escapeHtml(e.payload.eventType)}</code></td>
        <td>${escapeHtml(e.payload.actorId)}</td>
        <td><strong>${escapeHtml(e.payload.verdict)}</strong></td>
        <td><code>${escapeHtml(e.entryHash.slice(0, 16))}</code></td>
      </tr>`,
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TraceGate Compliance Certificate — ${escapeHtml(snapshot.scenarioTitle)}</title>
  <style>
    :root { --ink: #111827; --muted: #4b5563; --line: #e5e7eb; --bg: #ffffff; --soft: #f8fafc; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 32px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: var(--ink); background: #f3f4f6; line-height: 1.5; }
    .sheet { max-width: 960px; margin: 0 auto; background: var(--bg); border: 1px solid var(--line); border-radius: 10px; padding: 36px 40px; }
    .top { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; border-bottom: 2px solid var(--ink); padding-bottom: 16px; margin-bottom: 20px; }
    .kicker { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); font-weight: 600; }
    h1 { margin: 4px 0 6px; font-size: 22px; letter-spacing: -0.02em; }
    .badge { padding: 6px 14px; border-radius: 999px; color: #fff; font-weight: 700; font-size: 13px; background: ${verdictTone}; white-space: nowrap; }
    .meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 20px; background: var(--soft); border: 1px solid var(--line); border-radius: 8px; padding: 14px 16px; margin-bottom: 24px; font-size: 13px; }
    .meta-k { color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
    .meta-v { font-weight: 600; word-break: break-all; }
    h2 { font-size: 15px; margin: 24px 0 10px; border-bottom: 1px solid var(--line); padding-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; font-size: 12.5px; margin-bottom: 16px; }
    th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--line); vertical-align: top; }
    th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); background: var(--soft); }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 11.5px; background: #f1f5f9; padding: 1px 5px; border-radius: 4px; }
    .diff-card { border: 1px solid #fecaca; background: #fef2f2; border-radius: 6px; padding: 10px 12px; margin-bottom: 10px; font-size: 12.5px; font-family: ui-monospace, Menlo, monospace; }
    .diff-head { font-weight: 700; margin-bottom: 4px; font-family: inherit; }
    .diff-old { color: #991b1b; }
    .diff-new { color: #065f46; }
    .ok { color: #065f46; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 10px 12px; border-radius: 6px; font-size: 13px; }
    .print-bar { max-width: 960px; margin: 0 auto 14px; display: flex; justify-content: flex-end; }
    .print-btn { background: #111827; color: #fff; border: 0; border-radius: 6px; padding: 8px 14px; font-size: 12.5px; font-weight: 600; cursor: pointer; }
    @media print { body { background: #fff; padding: 0; } .sheet { border: 0; padding: 16px; } .print-bar { display: none; } }
  </style>
</head>
<body>
  <div class="print-bar"><button class="print-btn" onclick="window.print()">Print / Save as PDF</button></div>
  <main class="sheet">
    <header class="top">
      <div>
        <div class="kicker">TraceGate Regulatory Evidence Certificate · ${escapeHtml(snapshot.industryPreset ?? 'MEDTECH_IEC62304')}</div>
        <h1>${escapeHtml(snapshot.scenarioTitle)}</h1>
        <div style="font-size: 12.5px; color: var(--muted);">Evaluated ${escapeHtml(evaluation.evaluatedAt)} · Policy ${escapeHtml(snapshot.policy.version)}</div>
      </div>
      <div class="badge">${escapeHtml(evaluation.verdict)} · ${evaluation.confidenceScore}%</div>
    </header>

    <section class="meta">
      <div><div class="meta-k">SHA-256 Evidence Fingerprint</div><div class="meta-v"><code>${escapeHtml(evaluation.evidenceFingerprint)}</code></div></div>
      <div><div class="meta-k">Audit Ledger Chain Proof</div><div class="meta-v">${ledgerVerification.valid ? 'VERIFIED INTACT' : 'BROKEN'} (${ledgerVerification.totalEntries} entries)</div></div>
      <div><div class="meta-k">Workspace / Release Key</div><div class="meta-v">${escapeHtml(snapshot.projectKey)} · ${escapeHtml(snapshot.releaseNodeId)}</div></div>
      <div><div class="meta-k">FMEA Blast Exposure</div><div class="meta-v">${evaluation.fmeaExposureTotal} RPN (${evaluation.blastRadius.length} impacted)</div></div>
    </section>

    <h2>1. Requirements &amp; Artifact Traceability Matrix (RTM)</h2>
    <table>
      <thead><tr><th>Node ID</th><th>External ID</th><th>Pillar</th><th>Status</th><th>Ver</th><th>Live SHA-256</th><th>QA Certified By</th></tr></thead>
      <tbody>${rtmRows}</tbody>
    </table>

    <h2>2. Cryptographic Specification Drift</h2>
    ${diffBlock}

    <h2>3. Deterministic Policy Findings</h2>
    ${findingsBlock}

    <h2>4. Hash-Chained Audit Ledger Proof</h2>
    <table>
      <thead><tr><th>Seq</th><th>Timestamp</th><th>Event</th><th>Actor</th><th>Verdict</th><th>Entry SHA-256</th></tr></thead>
      <tbody>${ledgerRows}</tbody>
    </table>
  </main>
</body>
</html>`;
}
