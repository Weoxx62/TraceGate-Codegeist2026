import { describe, expect, it } from 'vitest';
import {
  buildIndustryDemoSnapshot,
  computeConnectedLineageIds,
  computeInlineTokenDiff,
  executeTwoPhaseCommit,
} from '../src/core/index';
import {
  MAX_RAW_CONTENT_LENGTH,
  sanitizeActorLabel,
  toSafeErrorMessage,
  validateIndustryPreset,
  validateNodeId,
  validateProjectKey,
  validateRawContent,
  validateSha256Hex,
  validateSpaceId,
  ValidationError,
} from '../src/backend/validation';

describe('TraceGate Security Hardening & Validation', () => {
  it('enforces valid Jira project keys and Confluence space IDs', () => {
    expect(validateProjectKey('med')).toBe('MED');
    expect(validateProjectKey('FIN_DORA1')).toBe('FIN_DORA1');
    expect(() => validateProjectKey('../../etc/passwd')).toThrow(ValidationError);
    expect(() => validateProjectKey('123BAD')).toThrow(ValidationError);

    expect(validateSpaceId('space-123_abc')).toBe('space-123_abc');
    expect(() => validateSpaceId('bad/space?query=1')).toThrow(ValidationError);
  });

  it('rejects oversized spec payloads (OWASP LLM10) and strips NUL/control bytes', () => {
    const oversized = 'A'.repeat(MAX_RAW_CONTENT_LENGTH + 1);
    expect(() => validateRawContent(oversized)).toThrow(ValidationError);
    expect(() => validateRawContent('   ')).toThrow(ValidationError);

    const cleaned = validateRawContent('Max\u0000 Limit:\n10U\u0007');
    expect(cleaned).toBe('Max Limit:\n10U');
  });

  it('validates node IDs against allowlist and enforces 64-char SHA-256 hex digests', () => {
    expect(validateNodeId('SPEC-BOLUS', ['SPEC-BOLUS', 'REQ-101'])).toBe(
      'SPEC-BOLUS',
    );
    expect(() => validateNodeId('__proto__', ['SPEC-BOLUS'])).toThrow(
      ValidationError,
    );

    const validHex = 'A'.repeat(64);
    expect(validateSha256Hex(validHex)).toBe('a'.repeat(64));
    expect(validateSha256Hex('not-a-sha256')).toBeNull();
    expect(validateSha256Hex(undefined)).toBeNull();
  });

  it('enforces industry preset allowlist, actor sanitization, and opaque error redaction', () => {
    expect(validateIndustryPreset('FINTECH_DORA')).toBe('FINTECH_DORA');
    expect(() => validateIndustryPreset('ARBITRARY_DROP_TABLE')).toThrow(
      ValidationError,
    );

    expect(sanitizeActorLabel('Alice\n\rAdmin\u0000', 'Fallback')).toBe(
      'AliceAdmin',
    );
    expect(toSafeErrorMessage(new ValidationError('Safe boundary message'))).toBe(
      'Safe boundary message',
    );
    expect(toSafeErrorMessage(new Error('SQL errno 1045 internal stack'))).toBe(
      'Internal TraceGate operation failed.',
    );
  });

  it('blocks Two-Phase Commit when Phase 1 expectedFingerprint is missing or malformed (OWASP LLM06)', async () => {
    const clean = buildIndustryDemoSnapshot('MEDTECH_IEC62304', 'CERTIFIED');
    let transitioned = false;

    const { result } = await executeTwoPhaseCommit({
      expectedFingerprint: 'MISSING_PHASE1_EXPECTED_FINGERPRINT',
      actorId: 'Autonomous MCP Agent',
      liveNodes: clean.nodes,
      liveEdges: clean.edges,
      releaseNodeId: clean.releaseNodeId,
      policy: clean.policy,
      ledger: clean.ledger,
      performTransition: () => {
        transitioned = true;
      },
    });

    expect(result.committed).toBe(false);
    expect(result.reasonCode).toBe('COMMIT_REJECTED_EVIDENCE_CHANGED');
    expect(transitioned).toBe(false);
  });
});

describe('Inline Token Diff & Causal Lineage Graph Utilities', () => {
  it('isolates the exact mutated token between approved and live clauses', () => {
    const diff = computeInlineTokenDiff(
      '[CLAUSE-BOLUS-01] Max Single Bolus Limit: 10U',
      '[CLAUSE-BOLUS-01] Max Single Bolus Limit: 15U',
    );
    expect(diff.prefix).toBe('[CLAUSE-BOLUS-01] Max Single Bolus Limit: ');
    expect(diff.removed).toBe('10U');
    expect(diff.added).toBe('15U');
    expect(diff.suffix).toBe('');
  });

  it('computes causal lineage safely even when cyclic edges exist', () => {
    const snap = buildIndustryDemoSnapshot('MEDTECH_IEC62304', 'DRIFTED');
    const cyclicEdges = [
      ...snap.edges,
      { fromId: 'REL-240', toId: 'SPEC-BOLUS', relation: 'GOVERNS' as const },
    ];
    const focus = computeConnectedLineageIds('SPEC-ALARM', cyclicEdges);
    expect(focus.nodeIds.has('SPEC-ALARM')).toBe(true);
    expect(focus.nodeIds.has('REQ-102')).toBe(true);
    expect(focus.nodeIds.has('TEST-402')).toBe(true);
  });
});
