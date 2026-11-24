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
import type { IndustryPreset } from '../core/index';
import {
  commitGovernedRelease,
  evaluateReleaseGate,
  inspectEvidenceDiff,
} from './actions/mcpAndRovoActions';

export const resolverHandler = makeResolver({
  getWorkspaceState: async () => {
    return getWorkspaceBundle(true);
  },

  seedDemo: async ({ payload }: Request<Record<string, unknown>>) => {
    const data = (payload ?? {}) as {
      projectKey?: string;
      spaceId?: string | null;
      spaceKey?: string | null;
      industryPreset?: IndustryPreset;
    };
    return seedMedTechDemo(data);
  },

  resetDemo: async ({ payload }: Request<Record<string, unknown>>) => {
    const data = (payload ?? {}) as { industryPreset?: IndustryPreset };
    return resetMedTechDemo(data.industryPreset);
  },

  simulateSpecDrift: async ({ payload }: Request<Record<string, unknown>>) => {
    const data = (payload ?? {}) as { newBolusLimit?: string };
    return triggerSpecDrift(data.newBolusLimit);
  },

  editNodeContent: async ({ payload }: Request<Record<string, unknown>>) => {
    const data = (payload ?? {}) as { nodeId: string; rawContent: string };
    return editNodeContentService(data);
  },

  simulateCommitRace: async () => {
    return simulateCommitRaceService();
  },

  qaSignOff: async ({ payload }: Request<Record<string, unknown>>) => {
    const data = (payload ?? {}) as { mode?: 'SELF_SIGN' | 'INDEPENDENT_QA' };
    return attemptQaSignOff({ mode: data.mode ?? 'SELF_SIGN' });
  },

  executeCommit: async ({ payload }: Request<Record<string, unknown>>) => {
    const data = (payload ?? {}) as { expectedFingerprint: string };
    return runGovernedReleaseCommit({
      expectedFingerprint: data.expectedFingerprint,
    });
  },

  createRemediation: async () => {
    return createRemediationTasksForBlockers();
  },

  exportAuditPack: async ({ payload }: Request<Record<string, unknown>>) => {
    const data = (payload ?? {}) as { spaceId?: string };
    return exportAuditPack(data.spaceId);
  },

  runMcpSimulatorTool: async ({ payload }: Request<Record<string, unknown>>) => {
    const data = (payload ?? {}) as {
      tool: 'evaluate-release-gate' | 'inspect-evidence-diff' | 'commit-governed-release';
      expectedFingerprint?: string;
    };
    if (data.tool === 'evaluate-release-gate') {
      return evaluateReleaseGate({ actorId: 'In-App MCP Simulator' });
    }
    if (data.tool === 'inspect-evidence-diff') {
      return inspectEvidenceDiff({ actorId: 'In-App MCP Simulator' });
    }
    return commitGovernedRelease({
      actorId: 'In-App MCP Simulator',
      expectedFingerprint: data.expectedFingerprint,
    });
  },
});
