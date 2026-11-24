import { appendLedgerEntry } from './auditLedger';
import { DEFAULT_POLICY, evaluateReleasePolicy } from './policyEngine';
import type {
  CommitGateResult,
  EvidenceEdge,
  EvidenceNode,
  LedgerEntry,
  PolicyDefinition,
} from './types';

export interface TwoPhaseCommitParams {
  expectedFingerprint: string;
  actorId: string;
  liveNodes: EvidenceNode[];
  liveEdges: EvidenceEdge[];
  releaseNodeId: string;
  policy?: PolicyDefinition;
  ledger: LedgerEntry[];
  nowIso?: string;
  performTransition: () => Promise<void> | void;
}

/**
 * Executes Phase 2 of TraceGate's Two-Phase Commit (EVALUATE -> COMMIT):
 * Re-evaluates the live Atlassian graph immediately before mutation, verifies that
 * the evidence fingerprint has not drifted since Phase 1 evaluation, enforces ALLOW verdict,
 * runs the Jira transition callback, and records a cryptographic receipt in the audit ledger.
 */
export async function executeTwoPhaseCommit(
  params: TwoPhaseCommitParams,
): Promise<{ result: CommitGateResult; nextLedger: LedgerEntry[] }> {
  const {
    expectedFingerprint,
    actorId,
    liveNodes,
    liveEdges,
    releaseNodeId,
    policy = DEFAULT_POLICY,
    ledger,
    nowIso = new Date().toISOString(),
    performTransition,
  } = params;

  const freshEvaluation = evaluateReleasePolicy(
    liveNodes,
    liveEdges,
    releaseNodeId,
    actorId,
    policy,
    nowIso,
  );

  if (freshEvaluation.evidenceFingerprint !== expectedFingerprint) {
    const { nextLedger, entry } = appendLedgerEntry(
      ledger,
      {
        eventType: 'COMMIT_REJECTED_EVIDENCE_CHANGED',
        actorId,
        releaseId: releaseNodeId,
        verdict: freshEvaluation.verdict,
        evidenceFingerprint: freshEvaluation.evidenceFingerprint,
        summary: `Two-Phase Commit aborted: live evidence fingerprint mutated between Evaluate (${expectedFingerprint.slice(0, 12)}) and Commit (${freshEvaluation.evidenceFingerprint.slice(0, 12)}).`,
        details: {
          expectedFingerprint,
          actualFingerprint: freshEvaluation.evidenceFingerprint,
          blockerCount: freshEvaluation.blockers.length,
        },
      },
      nowIso,
    );

    return {
      nextLedger,
      result: {
        committed: false,
        reasonCode: 'COMMIT_REJECTED_EVIDENCE_CHANGED',
        message: entry.payload.summary,
        evaluation: freshEvaluation,
        ledgerEntry: entry,
      },
    };
  }

  if (freshEvaluation.verdict !== 'ALLOW') {
    const firstBlocker = freshEvaluation.blockers[0]?.message ?? 'Unresolved policy blockers';
    const { nextLedger, entry } = appendLedgerEntry(
      ledger,
      {
        eventType: 'COMMIT_REJECTED_POLICY_BLOCK',
        actorId,
        releaseId: releaseNodeId,
        verdict: freshEvaluation.verdict,
        evidenceFingerprint: freshEvaluation.evidenceFingerprint,
        summary: `Release gate BLOCKED commit (${freshEvaluation.blockers.length} blocker(s)): ${firstBlocker}`,
        details: {
          confidenceScore: freshEvaluation.confidenceScore,
          blockerCodes: freshEvaluation.blockers.map((b) => b.code),
        },
      },
      nowIso,
    );

    return {
      nextLedger,
      result: {
        committed: false,
        reasonCode: 'COMMIT_REJECTED_POLICY_BLOCK',
        message: entry.payload.summary,
        evaluation: freshEvaluation,
        ledgerEntry: entry,
      },
    };
  }

  await performTransition();

  const { nextLedger, entry } = appendLedgerEntry(
    ledger,
    {
      eventType: 'COMMIT_EXECUTED',
      actorId,
      releaseId: releaseNodeId,
      verdict: freshEvaluation.verdict,
      evidenceFingerprint: freshEvaluation.evidenceFingerprint,
      summary: `Governed release commit executed for ${releaseNodeId} (Confidence ${freshEvaluation.confidenceScore}%, fingerprint ${freshEvaluation.evidenceFingerprint.slice(0, 12)}).`,
      details: {
        confidenceScore: freshEvaluation.confidenceScore,
      },
    },
    nowIso,
  );

  return {
    nextLedger,
    result: {
      committed: true,
      reasonCode: 'COMMIT_EXECUTED',
      message: entry.payload.summary,
      evaluation: freshEvaluation,
      ledgerEntry: entry,
    },
  };
}
