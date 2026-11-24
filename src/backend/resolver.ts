import { makeResolver, type Request } from '@forge/resolver';
import {
  attemptQaSignOff,
  createRemediationTasksForBlockers,
  editNodeContentService,
  exportAuditPack,
  getWorkspaceBundle,
  resetMedTechDemo,
  runGovernedReleaseCommit,
  seedMedTechDemo,
  simulateCommitRaceService,
  triggerSpecDrift,
} from './service';
import {
  commitGovernedRelease,
  evaluateReleaseGate,
  inspectEvidenceDiff,
} from './actions/mcpAndRovoActions';
import {
  toSafeErrorMessage,
  validateIndustryPreset,
  validateProjectKey,
  validateRawContent,
  validateSha256Hex,
  validateSpaceId,
  validateSpaceKey,
  validateThresholdOverride,
  ValidationError,
} from './validation';

async function safeExecute<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    throw new Error(toSafeErrorMessage(err));
  }
}

export const resolverHandler = makeResolver({
  getWorkspaceState: async () => safeExecute(() => getWorkspaceBundle(true)),

  seedDemo: async ({ payload }: Request<Record<string, unknown>>) =>
    safeExecute(() => {
      const raw = (payload ?? {}) as Record<string, unknown>;
      return seedMedTechDemo({
        projectKey: validateProjectKey(raw.projectKey),
        spaceId: validateSpaceId(raw.spaceId),
        spaceKey: validateSpaceKey(raw.spaceKey),
        industryPreset: validateIndustryPreset(raw.industryPreset),
      });
    }),

  resetDemo: async ({ payload }: Request<Record<string, unknown>>) =>
    safeExecute(() => {
      const raw = (payload ?? {}) as Record<string, unknown>;
      return resetMedTechDemo(validateIndustryPreset(raw.industryPreset));
    }),

  simulateSpecDrift: async ({ payload }: Request<Record<string, unknown>>) =>
    safeExecute(() => {
      const raw = (payload ?? {}) as Record<string, unknown>;
      return triggerSpecDrift(validateThresholdOverride(raw.newBolusLimit));
    }),

  editNodeContent: async ({ payload }: Request<Record<string, unknown>>) =>
    safeExecute(() => {
      const raw = (payload ?? {}) as Record<string, unknown>;
      if (typeof raw.nodeId !== 'string' || raw.nodeId.trim().length === 0) {
        throw new ValidationError('Missing nodeId.');
      }
      return editNodeContentService({
        nodeId: raw.nodeId.trim(),
        rawContent: validateRawContent(raw.rawContent),
      });
    }),

  simulateCommitRace: async () =>
    safeExecute(() => simulateCommitRaceService()),

  qaSignOff: async ({ payload }: Request<Record<string, unknown>>) =>
    safeExecute(() => {
      const raw = (payload ?? {}) as Record<string, unknown>;
      const mode =
        raw.mode === 'INDEPENDENT_QA' ? 'INDEPENDENT_QA' : 'SELF_SIGN';
      return attemptQaSignOff({ mode });
    }),

  executeCommit: async ({ payload }: Request<Record<string, unknown>>) =>
    safeExecute(() => {
      const raw = (payload ?? {}) as Record<string, unknown>;
      const expectedFingerprint =
        validateSha256Hex(raw.expectedFingerprint) ??
        'MISSING_PHASE1_EXPECTED_FINGERPRINT';
      return runGovernedReleaseCommit({ expectedFingerprint });
    }),

  createRemediation: async () =>
    safeExecute(() => createRemediationTasksForBlockers()),

  exportAuditPack: async ({ payload }: Request<Record<string, unknown>>) =>
    safeExecute(() => {
      const raw = (payload ?? {}) as Record<string, unknown>;
      const spaceId = validateSpaceId(raw.spaceId);
      return exportAuditPack(spaceId ?? undefined);
    }),

  runMcpSimulatorTool: async ({ payload }: Request<Record<string, unknown>>) =>
    safeExecute<unknown>(() => {
      const raw = (payload ?? {}) as Record<string, unknown>;
      if (raw.tool === 'evaluate-release-gate') {
        return evaluateReleaseGate({ actorId: 'In-App MCP Simulator' });
      }
      if (raw.tool === 'inspect-evidence-diff') {
        return inspectEvidenceDiff({ actorId: 'In-App MCP Simulator' });
      }
      if (raw.tool === 'commit-governed-release') {
        return commitGovernedRelease({
          actorId: 'In-App MCP Simulator',
          expectedFingerprint:
            typeof raw.expectedFingerprint === 'string'
              ? raw.expectedFingerprint
              : undefined,
        });
      }
      throw new ValidationError('Unsupported MCP tool identifier.');
    }),
});
