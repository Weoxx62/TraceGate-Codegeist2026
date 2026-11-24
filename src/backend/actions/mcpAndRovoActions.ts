import {
  createRemediationTasksForBlockers,
  getWorkspaceBundle,
  recordAgentToolInvocation,
  runGovernedReleaseCommit,
} from '../service';
import { sanitizeActorLabel, validateSha256Hex } from '../validation';

interface ActionPayload {
  inputs?: Record<string, unknown>;
  releaseId?: string;
  expectedFingerprint?: string;
  actorId?: string;
  context?: {
    principal?: { accountId?: string };
  };
}

function getParam(payload: ActionPayload, key: string): string | undefined {
  const fromInputs = payload?.inputs?.[key];
  if (typeof fromInputs === 'string' && fromInputs.trim().length > 0) {
    return fromInputs.trim();
  }
  const direct = (payload as Record<string, unknown>)?.[key];
  if (typeof direct === 'string' && direct.trim().length > 0) {
    return direct.trim();
  }
  return undefined;
}

export async function evaluateReleaseGate(payload: ActionPayload) {
  const actor = sanitizeActorLabel(
    getParam(payload, 'actorId'),
    'Rovo / MCP Client',
  );
  const bundle = await getWorkspaceBundle(false);

  await recordAgentToolInvocation({
    toolName: 'evaluate-release-gate',
    actorId: actor,
    summary: `Evaluated ${bundle.evaluation.releaseId}: ${bundle.evaluation.verdict} (${bundle.evaluation.confidenceScore}%)`,
  });

  return {
    releaseId: bundle.evaluation.releaseId,
    verdict: bundle.evaluation.verdict,
    confidenceScore: bundle.evaluation.confidenceScore,
    evidenceFingerprint: bundle.evaluation.evidenceFingerprint,
    blockerCount: bundle.evaluation.blockers.length,
    blockers: bundle.evaluation.blockers,
    blastRadiusCount: bundle.evaluation.blastRadius.length,
    fmeaExposureTotal: bundle.evaluation.fmeaExposureTotal,
  };
}

export async function inspectEvidenceDiff(payload: ActionPayload) {
  const actor = sanitizeActorLabel(
    getParam(payload, 'actorId'),
    'Rovo / MCP Client',
  );
  const bundle = await getWorkspaceBundle(false);

  await recordAgentToolInvocation({
    toolName: 'inspect-evidence-diff',
    actorId: actor,
    summary: `Inspected ${bundle.evaluation.clauseDiffs.length} clause diff(s) and ${bundle.evaluation.blastRadius.length} impacted node(s).`,
  });

  return {
    driftedRootIds: bundle.evaluation.driftedRootIds,
    clauseDiffs: bundle.evaluation.clauseDiffs,
    blastRadius: bundle.evaluation.blastRadius,
  };
}

export async function commitGovernedRelease(payload: ActionPayload) {
  const actor = sanitizeActorLabel(
    getParam(payload, 'actorId'),
    'Rovo / MCP Client',
  );
  const validFingerprint = validateSha256Hex(
    getParam(payload, 'expectedFingerprint'),
  );

  // Enforce Two-Phase Commit strictly (OWASP LLM06): never auto-fill from live state
  const commitOutcome = await runGovernedReleaseCommit({
    expectedFingerprint: validFingerprint ?? 'MISSING_PHASE1_EXPECTED_FINGERPRINT',
    actorOverride: actor,
  });

  if (!validFingerprint) {
    return {
      ...commitOutcome.commitResult,
      message:
        'Two-Phase Commit aborted: valid 64-character SHA-256 expectedFingerprint from evaluate-release-gate is required.',
    };
  }

  return commitOutcome.commitResult;
}

export async function createRemediationTasks(payload: ActionPayload) {
  const actor = sanitizeActorLabel(
    getParam(payload, 'actorId'),
    'Rovo / MCP Client',
  );
  const res = await createRemediationTasksForBlockers(actor);

  return {
    createdKeys: res.createdKeys,
    verdict: res.evaluation.verdict,
    blockerCount: res.evaluation.blockers.length,
    message:
      res.createdKeys.length > 0
        ? `Created Jira remediation tasks: ${res.createdKeys.join(', ')}`
        : `Recorded remediation plan for ${res.evaluation.blockers.length} blocker(s).`,
  };
}
