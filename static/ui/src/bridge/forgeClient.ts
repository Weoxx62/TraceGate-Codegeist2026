import {
  appendLedgerEntry,
  applySpecTampering,
  buildIndustryDemoSnapshot,
  certifyDriftedNodes,
  DEMO_USERS,
  evaluateReleasePolicy,
  executeTwoPhaseCommit,
  updateNodeRawContent,
  verifyLedgerChain,
  type CommitGateResult,
  type EvaluationResult,
  type EvidenceGraphSnapshot,
  type IndustryPreset,
  type LedgerVerificationResult,
} from '../../../../src/core/index';

export interface WorkspaceBundle {
  snapshot: EvidenceGraphSnapshot;
  evaluation: EvaluationResult;
  ledgerVerification: LedgerVerificationResult;
  environment?: {
    currentUser: { accountId: string; displayName: string };
    projects: Array<{ key: string; name: string }>;
    spaces: Array<{ id: string; key: string; name: string }>;
    confluenceConnected: boolean;
    jiraConnected: boolean;
  };
  storage?: {
    sqlAvailable: boolean;
    kvsAvailable: boolean;
    sqlError: string | null;
  };
}

export interface ForgeViewContext {
  moduleKey: string;
  isForgeRuntime: boolean;
  issueKey?: string;
}

const STANDALONE_ACTOR = 'Dr. Elena Rostova (Systems Eng)';

let standaloneSnapshot: EvidenceGraphSnapshot = buildIndustryDemoSnapshot(
  'MEDTECH_IEC62304',
  'DRIFTED',
  {
    workspaceKey: 'standalone-preview',
    projectKey: 'MED',
    confluenceSpaceKey: 'MEDTECH',
    currentActorName: STANDALONE_ACTOR,
  },
);

function buildStandaloneBundle(): WorkspaceBundle {
  const evaluation = evaluateReleasePolicy(
    standaloneSnapshot.nodes,
    standaloneSnapshot.edges,
    standaloneSnapshot.releaseNodeId,
    STANDALONE_ACTOR,
    standaloneSnapshot.policy,
  );

  return {
    snapshot: standaloneSnapshot,
    evaluation,
    ledgerVerification: verifyLedgerChain(standaloneSnapshot.ledger),
    environment: {
      currentUser: {
        accountId: 'standalone-judge',
        displayName: STANDALONE_ACTOR,
      },
      projects: [{ key: 'MED', name: 'CardioPulse MedTech Firmware' }],
      spaces: [{ id: 'space-med', key: 'MEDTECH', name: 'MedTech Regulatory SOPs' }],
      confluenceConnected: true,
      jiraConnected: true,
    },
    storage: {
      sqlAvailable: true,
      kvsAvailable: true,
      sqlError: null,
    },
  };
}

type ForgeBridgeModule = typeof import('@forge/bridge');

let cachedContext: ForgeViewContext | null = null;
let cachedBridge: ForgeBridgeModule | null = null;

function hasForgeHostBridge(): boolean {
  const host = globalThis as { __bridge?: { callBridge?: unknown } };
  return Boolean(host.__bridge && typeof host.__bridge.callBridge === 'function');
}

async function getForgeBridge(): Promise<ForgeBridgeModule | null> {
  if (cachedBridge) return cachedBridge;
  if (!hasForgeHostBridge()) return null;
  try {
    cachedBridge = await import('@forge/bridge');
    return cachedBridge;
  } catch {
    return null;
  }
}

export async function detectForgeContext(): Promise<ForgeViewContext> {
  if (cachedContext) return cachedContext;

  const bridge = await getForgeBridge();
  if (!bridge) {
    cachedContext = {
      moduleKey: 'tracegate-command-center',
      isForgeRuntime: false,
    };
    return cachedContext;
  }

  try {
    const ctx = (await Promise.race([
      bridge.view.getContext(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Forge bridge timeout')), 1500),
      ),
    ])) as { moduleKey?: string; extension?: { issue?: { key?: string } } };

    cachedContext = {
      moduleKey: ctx.moduleKey ?? 'tracegate-command-center',
      isForgeRuntime: true,
      issueKey: ctx.extension?.issue?.key,
    };
    return cachedContext;
  } catch {
    cachedContext = {
      moduleKey: 'tracegate-command-center',
      isForgeRuntime: false,
    };
    return cachedContext;
  }
}

async function callBackend<T>(
  resolverKey: string,
  payload: Record<string, unknown>,
  standaloneHandler: () => Promise<T> | T,
): Promise<T> {
  const ctx = await detectForgeContext();
  const bridge = ctx.isForgeRuntime ? await getForgeBridge() : null;
  if (ctx.isForgeRuntime && bridge) {
    return (await bridge.invoke(resolverKey, payload)) as T;
  }
  return standaloneHandler();
}

export async function fetchWorkspaceState(): Promise<WorkspaceBundle> {
  return callBackend('getWorkspaceState', {}, () => buildStandaloneBundle());
}

export async function seedDemoScenario(params: {
  projectKey?: string;
  spaceId?: string | null;
  spaceKey?: string | null;
  industryPreset?: IndustryPreset;
}): Promise<WorkspaceBundle> {
  return callBackend('seedDemo', params, () => {
    const preset = params.industryPreset ?? standaloneSnapshot.industryPreset ?? 'MEDTECH_IEC62304';
    standaloneSnapshot = buildIndustryDemoSnapshot(preset, 'DRIFTED', {
      workspaceKey: params.projectKey ?? 'MED',
      projectKey: params.projectKey ?? 'MED',
      confluenceSpaceKey: params.spaceKey ?? 'MEDTECH',
      currentActorName: STANDALONE_ACTOR,
    });
    return buildStandaloneBundle();
  });
}

export async function resetDemoScenario(
  industryPreset?: IndustryPreset,
): Promise<WorkspaceBundle> {
  return callBackend('resetDemo', { industryPreset }, () => {
    const preset = industryPreset ?? standaloneSnapshot.industryPreset ?? 'MEDTECH_IEC62304';
    standaloneSnapshot = buildIndustryDemoSnapshot(preset, 'CERTIFIED', {
      workspaceKey: standaloneSnapshot.workspaceKey,
      projectKey: standaloneSnapshot.projectKey,
      confluenceSpaceKey: standaloneSnapshot.confluenceSpaceKey,
      currentActorName: STANDALONE_ACTOR,
    });
    return buildStandaloneBundle();
  });
}

export async function triggerSpecDriftAction(
  newBolusLimit?: string,
): Promise<WorkspaceBundle> {
  return callBackend(
    'simulateSpecDrift',
    { newBolusLimit },
    () => {
      standaloneSnapshot = applySpecTampering(
        standaloneSnapshot,
        newBolusLimit,
        STANDALONE_ACTOR,
      );
      return buildStandaloneBundle();
    },
  );
}

export async function editNodeContentAction(params: {
  nodeId: string;
  rawContent: string;
}): Promise<WorkspaceBundle & { hashChanged: boolean; editMessage: string }> {
  return callBackend('editNodeContent', params, () => {
    const updated = updateNodeRawContent(
      standaloneSnapshot,
      params.nodeId,
      params.rawContent,
      STANDALONE_ACTOR,
    );
    standaloneSnapshot = updated.snapshot;
    return {
      ...buildStandaloneBundle(),
      hashChanged: updated.hashChanged,
      editMessage: updated.message,
    };
  });
}

export async function simulateCommitRaceAction(): Promise<
  WorkspaceBundle & { commitResult: CommitGateResult }
> {
  return callBackend('simulateCommitRace', {}, async () => {
    const phase1Eval = evaluateReleasePolicy(
      standaloneSnapshot.nodes,
      standaloneSnapshot.edges,
      standaloneSnapshot.releaseNodeId,
      STANDALONE_ACTOR,
      standaloneSnapshot.policy,
    );
    standaloneSnapshot = applySpecTampering(
      standaloneSnapshot,
      undefined,
      STANDALONE_ACTOR,
    );
    const { result, nextLedger } = await executeTwoPhaseCommit({
      expectedFingerprint: phase1Eval.evidenceFingerprint,
      actorId: STANDALONE_ACTOR,
      liveNodes: standaloneSnapshot.nodes,
      liveEdges: standaloneSnapshot.edges,
      releaseNodeId: standaloneSnapshot.releaseNodeId,
      policy: standaloneSnapshot.policy,
      ledger: standaloneSnapshot.ledger,
      performTransition: () => {},
    });
    standaloneSnapshot = { ...standaloneSnapshot, ledger: nextLedger };
    return {
      ...buildStandaloneBundle(),
      commitResult: result,
    };
  });
}

export async function attemptQaSignOffAction(
  mode: 'SELF_SIGN' | 'INDEPENDENT_QA',
): Promise<WorkspaceBundle & { signOffAllowed: boolean; signOffMessage: string }> {
  return callBackend('qaSignOff', { mode }, () => {
    const actor =
      mode === 'INDEPENDENT_QA' ? DEMO_USERS.QA_LEAD : STANDALONE_ACTOR;
    const res = certifyDriftedNodes(standaloneSnapshot, actor);
    standaloneSnapshot = res.snapshot;
    return {
      ...buildStandaloneBundle(),
      signOffAllowed: res.allowed,
      signOffMessage: res.reason,
    };
  });
}

export async function executeCommitAction(
  expectedFingerprint: string,
): Promise<WorkspaceBundle & { commitResult: CommitGateResult }> {
  return callBackend('executeCommit', { expectedFingerprint }, async () => {
    const { result, nextLedger } = await executeTwoPhaseCommit({
      expectedFingerprint,
      actorId: DEMO_USERS.RELEASE_MGR,
      liveNodes: standaloneSnapshot.nodes,
      liveEdges: standaloneSnapshot.edges,
      releaseNodeId: standaloneSnapshot.releaseNodeId,
      policy: standaloneSnapshot.policy,
      ledger: standaloneSnapshot.ledger,
      performTransition: () => {
        // Standalone simulated Jira transition
      },
    });

    standaloneSnapshot = {
      ...standaloneSnapshot,
      nodes: result.committed
        ? standaloneSnapshot.nodes.map((n) =>
            n.id === standaloneSnapshot.releaseNodeId
              ? { ...n, status: 'RELEASED' as const, approvedBy: DEMO_USERS.RELEASE_MGR }
              : n,
          )
        : standaloneSnapshot.nodes,
      ledger: nextLedger,
      lastSyncedAt: new Date().toISOString(),
    };

    return {
      ...buildStandaloneBundle(),
      commitResult: result,
    };
  });
}

export async function createRemediationAction(): Promise<
  WorkspaceBundle & { createdKeys: string[] }
> {
  return callBackend('createRemediation', {}, () => {
    const bundle = buildStandaloneBundle();
    const createdKeys = bundle.evaluation.blockers
      .slice(0, 3)
      .map((_, i) => `${standaloneSnapshot.projectKey}-${510 + i}`);

    const { nextLedger } = appendLedgerEntry(standaloneSnapshot.ledger, {
      eventType: 'REMEDIATION_CREATED',
      actorId: 'TraceGate UI',
      releaseId: standaloneSnapshot.releaseNodeId,
      verdict: bundle.evaluation.verdict,
      evidenceFingerprint: bundle.evaluation.evidenceFingerprint,
      summary: `Created remediation tasks: ${createdKeys.join(', ')}`,
    });
    standaloneSnapshot = { ...standaloneSnapshot, ledger: nextLedger };
    return {
      ...buildStandaloneBundle(),
      createdKeys,
    };
  });
}

export async function exportAuditPackAction(
  spaceId?: string,
): Promise<WorkspaceBundle & { exportedPageId: string | null }> {
  return callBackend('exportAuditPack', { spaceId }, () => {
    const bundle = buildStandaloneBundle();
    const { nextLedger } = appendLedgerEntry(standaloneSnapshot.ledger, {
      eventType: 'AUDIT_PACK_EXPORTED',
      actorId: STANDALONE_ACTOR,
      releaseId: standaloneSnapshot.releaseNodeId,
      verdict: bundle.evaluation.verdict,
      evidenceFingerprint: bundle.evaluation.evidenceFingerprint,
      summary: 'Exported Audit Evidence Pack to Confluence (Standalone Preview).',
    });
    standaloneSnapshot = { ...standaloneSnapshot, ledger: nextLedger };
    return {
      ...buildStandaloneBundle(),
      exportedPageId: 'preview-audit-pack-page',
    };
  });
}

export async function runMcpSimulatorAction(params: {
  tool:
    | 'evaluate-release-gate'
    | 'inspect-evidence-diff'
    | 'commit-governed-release';
  expectedFingerprint?: string;
}): Promise<Record<string, unknown>> {
  return callBackend('runMcpSimulatorTool', params, async () => {
    const bundle = buildStandaloneBundle();
    if (params.tool === 'evaluate-release-gate') {
      const { nextLedger } = appendLedgerEntry(standaloneSnapshot.ledger, {
        eventType: 'AGENT_TOOL_CALL',
        actorId: 'In-App MCP Simulator',
        releaseId: bundle.evaluation.releaseId,
        verdict: bundle.evaluation.verdict,
        evidenceFingerprint: bundle.evaluation.evidenceFingerprint,
        summary: `[evaluate-release-gate] ${bundle.evaluation.verdict} (${bundle.evaluation.confidenceScore}%)`,
      });
      standaloneSnapshot = { ...standaloneSnapshot, ledger: nextLedger };
      return {
        tool: 'evaluate-release-gate',
        verdict: bundle.evaluation.verdict,
        confidenceScore: bundle.evaluation.confidenceScore,
        evidenceFingerprint: bundle.evaluation.evidenceFingerprint,
        blockers: bundle.evaluation.blockers,
        blastRadiusCount: bundle.evaluation.blastRadius.length,
      };
    }

    if (params.tool === 'inspect-evidence-diff') {
      const { nextLedger } = appendLedgerEntry(standaloneSnapshot.ledger, {
        eventType: 'AGENT_TOOL_CALL',
        actorId: 'In-App MCP Simulator',
        releaseId: bundle.evaluation.releaseId,
        verdict: bundle.evaluation.verdict,
        evidenceFingerprint: bundle.evaluation.evidenceFingerprint,
        summary: `[inspect-evidence-diff] ${bundle.evaluation.clauseDiffs.length} clause diff(s)`,
      });
      standaloneSnapshot = { ...standaloneSnapshot, ledger: nextLedger };
      return {
        tool: 'inspect-evidence-diff',
        driftedRootIds: bundle.evaluation.driftedRootIds,
        clauseDiffs: bundle.evaluation.clauseDiffs,
        blastRadius: bundle.evaluation.blastRadius,
      };
    }

    const commit = await executeCommitAction(
      params.expectedFingerprint ?? bundle.evaluation.evidenceFingerprint,
    );
    return {
      tool: 'commit-governed-release',
      ...commit.commitResult,
    };
  });
}
