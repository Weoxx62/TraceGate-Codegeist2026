import type {
  EvaluationResult,
  EvidenceGraphSnapshot,
  LedgerVerificationResult,
} from './types';

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
        `| \`${n.id}\` | \`${n.externalId}\` | ${n.pillar} | **${n.status}** | v${n.version} | \`${n.liveHash.slice(0, 16)}\` | ${n.approvedBy ?? 'Pending'} |`,
    ),
    '',
  ];

  if (evaluation.clauseDiffs.length > 0) {
    lines.push('## 2. Cryptographic Specification Drift (Approved vs Live)', '');
    for (const diff of evaluation.clauseDiffs) {
      lines.push(
        `- **${diff.externalId} [${diff.clauseKey}]**`,
        `  - Approved QA Baseline: \`${diff.approvedLine ?? 'N/A'}\``,
        `  - Live Content: \`${diff.liveLine ?? 'N/A'}\``,
      );
    }
    lines.push('');
  }

  lines.push('## 3. Deterministic Policy Findings', '');
  if (evaluation.blockers.length === 0) {
    lines.push('All 5 deterministic compliance predicates passed with zero blockers.', '');
  } else {
    for (const b of evaluation.blockers) {
      lines.push(`- **[BLOCKER · ${b.code}] ${b.externalId}**: ${b.message} *(Remediation: ${b.remediation})*`);
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
        `| ${e.index} | \`${e.timestamp}\` | \`${e.payload.eventType}\` | ${e.payload.actorId} | ${e.payload.verdict} | \`${e.entryHash.slice(0, 16)}\` |`,
    ),
    '',
  );

  return lines.join('\n');
}
