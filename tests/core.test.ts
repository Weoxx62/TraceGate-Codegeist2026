import { describe, expect, it } from 'vitest';
import {
  appendLedgerEntry,
  applySpecTampering,
  buildIndustryDemoSnapshot,
  buildMedTechDemoSnapshot,
  certifyDriftedNodes,
  computeClauseDiffs,
  computeTransitiveBlastRadius,
  DEFAULT_POLICY,
  DEMO_USERS,
  detectCycles,
  evaluateReleasePolicy,
  executeTwoPhaseCommit,
  generateAuditPackMarkdown,
  hashSpecContent,
  INDUSTRY_PRESETS,
  normalizeSpecContent,
  sha256Hex,
  updateNodeRawContent,
  verifyLedgerChain,
  type IndustryPreset,
} from '../src/core/index';

describe('TraceGate Core Engine', () => {
  it('computes RFC 6234 compliant SHA-256 digests', () => {
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    expect(sha256Hex('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  it('produces identical hashes for cosmetic formatting edits (zero false positives)', () => {
    const clean = `[CLAUSE-BOLUS-01] Max Single Bolus Limit: 10U.\n[CLAUSE-OCCLUSION-02] Alarm <= 1200ms`;
    const cosmeticEdit = `**# [CLAUSE-BOLUS-01]**   Max   Single   Bolus Limit:  10U,  \n\n  [CLAUSE-OCCLUSION-02]   Alarm <= 1200ms;`;

    expect(hashSpecContent(clean).hash).toBe(hashSpecContent(cosmeticEdit).hash);
  });

  it('normalizes Confluence ADF JSON and catches numeric threshold changes with exact ClauseDiffs', () => {
    const adfApproved = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '[CLAUSE-BOLUS-01] Max Single Bolus Limit: 10U' }],
        },
      ],
    };
    const adfEdited = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '[CLAUSE-BOLUS-01] Max Single Bolus Limit: 15U' }],
        },
      ],
    };

    const h1 = hashSpecContent(adfApproved);
    const h2 = hashSpecContent(adfEdited);

    expect(h1.hash).not.toBe(h2.hash);
    const diffs = computeClauseDiffs(
      normalizeSpecContent(adfApproved).canonicalText,
      normalizeSpecContent(adfEdited).canonicalText,
      'SPEC-BOLUS',
      'CONF-SOP-204',
    );
    expect(diffs).toHaveLength(1);
    expect(diffs[0].clauseKey).toBe('CLAUSE-BOLUS-01');
    expect(diffs[0].approvedLine).toContain('10U');
    expect(diffs[0].liveLine).toContain('15U');
  });

  it('propagates transitive BFS blast radius and handles cyclic graphs safely', () => {
    const snapshot = buildMedTechDemoSnapshot('DRIFTED');
    const evaluation = evaluateReleasePolicy(
      snapshot.nodes,
      snapshot.edges,
      snapshot.releaseNodeId,
      DEMO_USERS.RELEASE_MGR,
    );

    expect(evaluation.verdict).toBe('BLOCK');
    expect(evaluation.driftedRootIds).toEqual(['SPEC-BOLUS']);
    expect(evaluation.blastRadius.map((b) => b.nodeId)).toEqual(
      expect.arrayContaining(['REQ-101', 'FMEA-301', 'TEST-401', 'TEST-403', 'FW-240', 'REL-240']),
    );
    expect(evaluation.blastRadius.some((b) => b.nodeId === 'REQ-102')).toBe(false);

    const cyclicEdges = [
      ...snapshot.edges,
      { fromId: 'REL-240', toId: 'SPEC-BOLUS', relation: 'GATES' as const },
    ];
    const cycles = detectCycles(snapshot.nodes, cyclicEdges);
    expect(cycles.length).toBeGreaterThan(0);

    const bounded = computeTransitiveBlastRadius(snapshot.nodes, cyclicEdges, ['SPEC-BOLUS']);
    expect(bounded.length).toBeGreaterThanOrEqual(6);
  });

  it('enforces Segregation of Duties (SoD) against self-certification and allows independent QA co-sign', () => {
    const drifted = buildMedTechDemoSnapshot('DRIFTED', {
      currentActorName: 'Judge Reviewer',
    });

    const selfAttempt = certifyDriftedNodes(drifted, 'Judge Reviewer');
    expect(selfAttempt.allowed).toBe(false);
    expect(selfAttempt.reason).toContain('SOD_VIOLATION');
    expect(selfAttempt.snapshot.ledger.at(-1)?.payload.eventType).toBe(
      'SOD_VIOLATION_BLOCKED',
    );

    const independentQa = certifyDriftedNodes(
      selfAttempt.snapshot,
      DEMO_USERS.QA_LEAD,
    );
    expect(independentQa.allowed).toBe(true);

    const postEval = evaluateReleasePolicy(
      independentQa.snapshot.nodes,
      independentQa.snapshot.edges,
      independentQa.snapshot.releaseNodeId,
      DEMO_USERS.RELEASE_MGR,
    );
    expect(postEval.verdict).toBe('ALLOW');
    expect(postEval.confidenceScore).toBe(100);
  });

  it('aborts Two-Phase Commit when live evidence mutates between Evaluate and Commit', async () => {
    const clean = buildMedTechDemoSnapshot('CERTIFIED');
    const phase1 = evaluateReleasePolicy(
      clean.nodes,
      clean.edges,
      clean.releaseNodeId,
      DEMO_USERS.RELEASE_MGR,
    );
    expect(phase1.verdict).toBe('ALLOW');

    // Simulate concurrent spec tampering before Phase 2 Commit arrives
    const mutated = applySpecTampering(clean, '22U', DEMO_USERS.AUTHOR);
    let transitionCalled = false;

    const commitAttempt = await executeTwoPhaseCommit({
      expectedFingerprint: phase1.evidenceFingerprint,
      actorId: DEMO_USERS.RELEASE_MGR,
      liveNodes: mutated.nodes,
      liveEdges: mutated.edges,
      releaseNodeId: mutated.releaseNodeId,
      policy: DEFAULT_POLICY,
      ledger: mutated.ledger,
      performTransition: () => {
        transitionCalled = true;
      },
    });

    expect(transitionCalled).toBe(false);
    expect(commitAttempt.result.committed).toBe(false);
    expect(commitAttempt.result.reasonCode).toBe('COMMIT_REJECTED_EVIDENCE_CHANGED');
  });

  it('executes Two-Phase Commit when live fingerprint matches and verdict is ALLOW', async () => {
    const clean = buildMedTechDemoSnapshot('CERTIFIED');
    const phase1 = evaluateReleasePolicy(
      clean.nodes,
      clean.edges,
      clean.releaseNodeId,
      DEMO_USERS.RELEASE_MGR,
    );
    let transitionCalled = false;

    const commitAttempt = await executeTwoPhaseCommit({
      expectedFingerprint: phase1.evidenceFingerprint,
      actorId: DEMO_USERS.RELEASE_MGR,
      liveNodes: clean.nodes,
      liveEdges: clean.edges,
      releaseNodeId: clean.releaseNodeId,
      ledger: clean.ledger,
      performTransition: () => {
        transitionCalled = true;
      },
    });

    expect(transitionCalled).toBe(true);
    expect(commitAttempt.result.committed).toBe(true);
    expect(commitAttempt.result.reasonCode).toBe('COMMIT_EXECUTED');
    expect(verifyLedgerChain(commitAttempt.nextLedger).valid).toBe(true);
  });

  it('detects single-character tampering at any index in the SHA-256 audit ledger', () => {
    let ledger = buildMedTechDemoSnapshot('DRIFTED').ledger;
    ledger = appendLedgerEntry(ledger, {
      eventType: 'AGENT_TOOL_CALL',
      actorId: 'rovo:mcp',
      releaseId: 'REL-240',
      verdict: 'BLOCK',
      evidenceFingerprint: 'abc123',
      summary: 'MCP tool evaluated release gate',
    }).nextLedger;

    expect(verifyLedgerChain(ledger).valid).toBe(true);

    const tampered = ledger.map((entry, idx) =>
      idx === 1
        ? {
            ...entry,
            payload: { ...entry.payload, summary: `${entry.payload.summary}!` },
          }
        : entry,
    );

    const check = verifyLedgerChain(tampered);
    expect(check.valid).toBe(false);
    expect(check.brokenAtIndex).toBe(1);
  });

  it('supports MedTech, FinTech DORA, and Automotive ISO 26262 presets deterministically', () => {
    const presets: IndustryPreset[] = [
      'MEDTECH_IEC62304',
      'FINTECH_DORA',
      'AUTOMOTIVE_ISO26262',
    ];

    for (const preset of presets) {
      const drifted = buildIndustryDemoSnapshot(preset, 'DRIFTED');
      const driftedEval = evaluateReleasePolicy(
        drifted.nodes,
        drifted.edges,
        drifted.releaseNodeId,
        DEMO_USERS.RELEASE_MGR,
      );
      expect(drifted.industryPreset).toBe(preset);
      expect(driftedEval.verdict).toBe('BLOCK');
      expect(driftedEval.clauseDiffs.length).toBeGreaterThan(0);
      expect(driftedEval.clauseDiffs[0].approvedLine).toContain(
        INDUSTRY_PRESETS[preset].approvedDriftValue,
      );
      expect(driftedEval.clauseDiffs[0].liveLine).toContain(
        INDUSTRY_PRESETS[preset].driftedValue,
      );

      const clean = buildIndustryDemoSnapshot(preset, 'CERTIFIED');
      const cleanEval = evaluateReleasePolicy(
        clean.nodes,
        clean.edges,
        clean.releaseNodeId,
        DEMO_USERS.RELEASE_MGR,
      );
      expect(cleanEval.verdict).toBe('ALLOW');
      expect(cleanEval.confidenceScore).toBe(100);
    }
  });

  it('ignores cosmetic node edits via updateNodeRawContent while catching normative changes', () => {
    const clean = buildIndustryDemoSnapshot('FINTECH_DORA', 'CERTIFIED');
    const specNode = clean.nodes.find((n) => n.id === 'SPEC-BOLUS')!;

    const cosmeticFormatted = specNode.rawContent
      .split('\n')
      .map((l) => `**${l}**,   `)
      .join('\n\n');
    const cosmeticResult = updateNodeRawContent(
      clean,
      'SPEC-BOLUS',
      cosmeticFormatted,
      DEMO_USERS.AUTHOR,
    );
    expect(cosmeticResult.hashChanged).toBe(false);
    const evalAfterCosmetic = evaluateReleasePolicy(
      cosmeticResult.snapshot.nodes,
      cosmeticResult.snapshot.edges,
      cosmeticResult.snapshot.releaseNodeId,
      DEMO_USERS.RELEASE_MGR,
    );
    expect(evalAfterCosmetic.verdict).toBe('ALLOW');

    const normativeEdit = specNode.rawContent.replace('EUR 10000', 'EUR 75000');
    const normativeResult = updateNodeRawContent(
      cosmeticResult.snapshot,
      'SPEC-BOLUS',
      normativeEdit,
      DEMO_USERS.AUTHOR,
    );
    expect(normativeResult.hashChanged).toBe(true);
    const evalAfterNormative = evaluateReleasePolicy(
      normativeResult.snapshot.nodes,
      normativeResult.snapshot.edges,
      normativeResult.snapshot.releaseNodeId,
      DEMO_USERS.RELEASE_MGR,
    );
    expect(evalAfterNormative.verdict).toBe('BLOCK');
  });

  it('generates a complete regulator Audit Evidence Pack in Markdown', () => {
    const snapshot = buildIndustryDemoSnapshot('AUTOMOTIVE_ISO26262', 'DRIFTED');
    const evaluation = evaluateReleasePolicy(
      snapshot.nodes,
      snapshot.edges,
      snapshot.releaseNodeId,
      DEMO_USERS.RELEASE_MGR,
    );
    const verification = verifyLedgerChain(snapshot.ledger);
    const markdown = generateAuditPackMarkdown(snapshot, evaluation, verification);

    expect(markdown).toContain('AUTOMOTIVE_ISO26262');
    expect(markdown).toContain(evaluation.evidenceFingerprint);
    expect(markdown).toContain('VERIFIED INTACT');
    expect(markdown).toContain('CLAUSE-AEB-01');
  });

  it('aligns clauses by key when header lines are inserted without cascading positional diffs', () => {
    const approved = [
      'CardioPulse Gen-4 Insulin Pump — Dosimetry Safety Specification v2.4',
      '[CLAUSE-BOLUS-01] Max Single Bolus Limit: 10U',
      '[CLAUSE-OCCLUSION-02] Downstream Occlusion Alarm Latency: <= 1200ms',
      '[CLAUSE-FAILSAFE-03] Dual-MCU Watchdog Cutoff: Active',
    ].join('\n');

    const editedWithInsertedNote = [
      'CardioPulse Gen-4 Insulin Pump — Dosimetry Safety Specification v2.4',
      'Editorial Note: Clarified regulatory scope for EU MDR Annex I',
      '[CLAUSE-BOLUS-01] Max Single Bolus Limit: 15U',
      '[CLAUSE-OCCLUSION-02] Downstream Occlusion Alarm Latency: <= 1200ms',
      '[CLAUSE-FAILSAFE-03] Dual-MCU Watchdog Cutoff: Active',
    ].join('\n');

    const diffs = computeClauseDiffs(
      approved,
      editedWithInsertedNote,
      'SPEC-BOLUS',
      'CONF-SOP-204',
    );

    const bolusDiff = diffs.find((d) => d.clauseKey === 'CLAUSE-BOLUS-01');
    expect(bolusDiff).toBeDefined();
    expect(bolusDiff?.changeType).toBe('MODIFIED');
    expect(bolusDiff?.approvedLine).toContain('10U');
    expect(bolusDiff?.liveLine).toContain('15U');

    // Unchanged clauses below must NOT appear as drifted due to index shift
    expect(diffs.some((d) => d.clauseKey === 'CLAUSE-OCCLUSION-02')).toBe(false);
    expect(diffs.some((d) => d.clauseKey === 'CLAUSE-FAILSAFE-03')).toBe(false);
    expect(diffs.some((d) => d.changeType === 'ADDED')).toBe(true);
  });

  it('reconciles downstream node statuses and blocks RELEASED nodes when post-release drift occurs', () => {
    const clean = buildIndustryDemoSnapshot('MEDTECH_IEC62304', 'CERTIFIED');
    const releasedNodes = clean.nodes.map((n) =>
      n.id === 'REL-240' ? { ...n, status: 'RELEASED' as const } : n,
    );
    const releasedSnapshot = { ...clean, nodes: releasedNodes };

    const tampered = applySpecTampering(releasedSnapshot, '22U', DEMO_USERS.AUTHOR);
    const req101 = tampered.nodes.find((n) => n.id === 'REQ-101');
    const test401 = tampered.nodes.find((n) => n.id === 'TEST-401');
    const rel240 = tampered.nodes.find((n) => n.id === 'REL-240');

    expect(req101?.status).toBe('SUSPECT');
    expect(test401?.status).toBe('SUSPECT');
    expect(rel240?.status).toBe('BLOCKED');
  });
});
