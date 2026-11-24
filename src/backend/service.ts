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
} from '../core/index';
import {
  createJiraIssue,
  deleteSeededConfluencePage,
  deleteSeededJiraIssues,
  exportConfluenceAuditPack,
  fetchEnvironmentTargets,
  seedLiveAtlassianArtifacts,
  syncLiveAtlassianNodes,
  transitionAndCommentReleaseIssue,
  upsertConfluenceSpecPage,
  type AtlassianEnvironmentTargets,
} from './atlassian/clients';
import {
  getStorageDiagnostics,
  loadSnapshot,
  saveSnapshot,
  type StorageDiagnostics,
} from './persistence/store';
import { validateNodeId, validateRawContent } from './validation';

export interface WorkspaceBundle {
  snapshot: EvidenceGraphSnapshot;
  evaluation: EvaluationResult;
  ledgerVerification: LedgerVerificationResult;
  environment?: AtlassianEnvironmentTargets;
  storage?: StorageDiagnostics;
}

export async function getWorkspaceBundle(
  includeEnvironment = false,
): Promise<WorkspaceBundle> {
  let snapshot = await loadSnapshot();
  const syncedSnapshot = await syncLiveAtlassianNodes(snapshot);
  if (syncedSnapshot !== snapshot) {
    snapshot = syncedSnapshot;
    await saveSnapshot(snapshot);
  }

  let env: AtlassianEnvironmentTargets | undefined;
  let storageDiag: StorageDiagnostics | undefined;
  if (includeEnvironment) {
    [env, storageDiag] = await Promise.all([
      fetchEnvironmentTargets(),
      getStorageDiagnostics(),
    ]);
  }

  const actorName = env?.currentUser.displayName ?? DEMO_USERS.RELEASE_MGR;
  const evaluation = evaluateReleasePolicy(
    snapshot.nodes,
    snapshot.edges,
    snapshot.releaseNodeId,
    actorName,
    snapshot.policy,
  );

  return {
    snapshot,
    evaluation,
    ledgerVerification: verifyLedgerChain(snapshot.ledger),
    environment: env,
    storage: storageDiag,
  };
}

export async function seedMedTechDemo(params: {
  projectKey?: string;
  spaceId?: string | null;
  spaceKey?: string | null;
  industryPreset?: IndustryPreset;
}): Promise<WorkspaceBundle> {
  const existing = await loadSnapshot();
  await deleteSeededJiraIssues(existing.seededJiraIssueKeys);
  await deleteSeededConfluencePage(existing.seededConfluencePageId);

  const env = await fetchEnvironmentTargets();
  const preset = params.industryPreset ?? existing.industryPreset ?? 'MEDTECH_IEC62304';
  const chosenProjectKey =
    params.projectKey ?? env.projects[0]?.key ?? 'MED';
  const chosenSpace =
    (params.spaceId
      ? env.spaces.find((s) => s.id === params.spaceId)
      : env.spaces[0]) ?? null;

  let snapshot = buildIndustryDemoSnapshot(preset, 'DRIFTED', {
    workspaceKey: chosenProjectKey,
    projectKey: chosenProjectKey,
    confluenceSpaceKey: params.spaceKey ?? chosenSpace?.key ?? null,
    currentActorName: env.currentUser.displayName,
  });

  if (env.jiraConnected && env.projects.some((p) => p.key === chosenProjectKey)) {
    const seeded = await seedLiveAtlassianArtifacts(
      snapshot,
      chosenProjectKey,
      chosenSpace?.id ?? null,
    );

    const nextNodes = snapshot.nodes.map((node) => {
      const jiraKey = seeded.seededJiraIssueKeys[node.id];
      if (jiraKey) {
        return {
          ...node,
          externalId: jiraKey,
          url: env.siteBaseUrl
            ? `${env.siteBaseUrl}/browse/${encodeURIComponent(jiraKey)}`
            : node.url,
        };
      }
      if (
        node.id === 'SPEC-BOLUS' &&
        seeded.seededConfluencePageId &&
        chosenSpace?.key &&
        env.siteBaseUrl
      ) {
        return {
          ...node,
          url: `${env.siteBaseUrl}/wiki/spaces/${encodeURIComponent(chosenSpace.key)}/pages/${encodeURIComponent(seeded.seededConfluencePageId)}`,
        };
      }
      return node;
    });

    snapshot = {
      ...snapshot,
      nodes: nextNodes,
      seededJiraIssueKeys: seeded.seededJiraIssueKeys,
      seededConfluencePageId: seeded.seededConfluencePageId,
    };
  }

  await saveSnapshot(snapshot);
  return getWorkspaceBundle(true);
}

export async function resetMedTechDemo(
  industryPreset?: IndustryPreset,
): Promise<WorkspaceBundle> {
  const existing = await loadSnapshot();
  await deleteSeededJiraIssues(existing.seededJiraIssueKeys);
  await deleteSeededConfluencePage(existing.seededConfluencePageId);

  const clean = buildIndustryDemoSnapshot(
    industryPreset ?? existing.industryPreset ?? 'MEDTECH_IEC62304',
    'CERTIFIED',
    {
      workspaceKey: existing.workspaceKey,
      projectKey: existing.projectKey,
      confluenceSpaceKey: existing.confluenceSpaceKey,
    },
  );
  await saveSnapshot(clean);
  return getWorkspaceBundle(true);
}

export async function triggerSpecDrift(
  newThresholdValue?: string,
  actorOverride?: string,
): Promise<WorkspaceBundle> {
  let snapshot = await loadSnapshot();
  const env = await fetchEnvironmentTargets();
  const actor = actorOverride ?? env.currentUser.displayName;

  snapshot = applySpecTampering(snapshot, newThresholdValue, actor);

  const specNode = snapshot.nodes.find((n) => n.id === 'SPEC-BOLUS');
  if (snapshot.seededConfluencePageId && specNode && env.spaces[0]) {
    await upsertConfluenceSpecPage({
      spaceId: env.spaces[0].id,
      existingPageId: snapshot.seededConfluencePageId,
      title: `[TraceGate Demo] ${specNode.title}`,
      lines: specNode.rawContent.split('\n'),
    });
  }

  await saveSnapshot(snapshot);
  return getWorkspaceBundle(false);
}

export async function editNodeContentService(params: {
  nodeId: string;
  rawContent: string;
}): Promise<WorkspaceBundle & { hashChanged: boolean; editMessage: string }> {
  let snapshot = await loadSnapshot();
  const safeNodeId = validateNodeId(
    params.nodeId,
    snapshot.nodes.map((n) => n.id),
  );
  const safeContent = validateRawContent(params.rawContent);
  const env = await fetchEnvironmentTargets();
  const updated = updateNodeRawContent(
    snapshot,
    safeNodeId,
    safeContent,
    env.currentUser.displayName,
  );
  snapshot = updated.snapshot;

  if (
    safeNodeId === 'SPEC-BOLUS' &&
    snapshot.seededConfluencePageId &&
    env.spaces[0] &&
    updated.hashChanged
  ) {
    const specNode = snapshot.nodes.find((n) => n.id === 'SPEC-BOLUS');
    if (specNode) {
      await upsertConfluenceSpecPage({
        spaceId: env.spaces[0].id,
        existingPageId: snapshot.seededConfluencePageId,
        title: `[TraceGate Demo] ${specNode.title}`,
        lines: specNode.rawContent.split('\n'),
      });
    }
  }

  await saveSnapshot(snapshot);
  const bundle = await getWorkspaceBundle(false);
  return {
    ...bundle,
    hashChanged: updated.hashChanged,
    editMessage: updated.message,
  };
}

export async function simulateCommitRaceService(): Promise<
  WorkspaceBundle & { commitResult: CommitGateResult }
> {
  let snapshot = await loadSnapshot();
  const env = await fetchEnvironmentTargets();
  const phase1Eval = evaluateReleasePolicy(
    snapshot.nodes,
    snapshot.edges,
    snapshot.releaseNodeId,
    env.currentUser.displayName,
    snapshot.policy,
  );

  // Concurrent upstream tampering occurs after Phase 1 Evaluate and before Phase 2 Commit
  snapshot = applySpecTampering(snapshot, undefined, env.currentUser.displayName);

  const { result, nextLedger } = await executeTwoPhaseCommit({
    expectedFingerprint: phase1Eval.evidenceFingerprint,
    actorId: env.currentUser.displayName,
    liveNodes: snapshot.nodes,
    liveEdges: snapshot.edges,
    releaseNodeId: snapshot.releaseNodeId,
    policy: snapshot.policy,
    ledger: snapshot.ledger,
    performTransition: () => {
      // Never reached when fingerprint drifted mid-flight
    },
  });

  snapshot = { ...snapshot, ledger: nextLedger };
  await saveSnapshot(snapshot);
  const bundle = await getWorkspaceBundle(false);
  return {
    ...bundle,
    commitResult: result,
  };
}

export async function attemptQaSignOff(params: {
  mode: 'SELF_SIGN' | 'INDEPENDENT_QA';
}): Promise<WorkspaceBundle & { signOffAllowed: boolean; signOffMessage: string }> {
  let snapshot = await loadSnapshot();
  const env = await fetchEnvironmentTargets();
  const actor =
    params.mode === 'INDEPENDENT_QA'
      ? DEMO_USERS.QA_LEAD
      : env.currentUser.displayName;

  const res = certifyDriftedNodes(snapshot, actor);
  snapshot = res.snapshot;
  await saveSnapshot(snapshot);

  const bundle = await getWorkspaceBundle(false);
  return {
    ...bundle,
    signOffAllowed: res.allowed,
    signOffMessage: res.reason,
  };
}

export async function runGovernedReleaseCommit(params: {
  expectedFingerprint: string;
  actorOverride?: string;
}): Promise<WorkspaceBundle & { commitResult: CommitGateResult }> {
  let snapshot = await loadSnapshot();
  snapshot = await syncLiveAtlassianNodes(snapshot);
  const env = await fetchEnvironmentTargets();
  const actor = params.actorOverride ?? env.currentUser.displayName;

  const releaseIssueKey = snapshot.seededJiraIssueKeys[snapshot.releaseNodeId];
  const { result, nextLedger } = await executeTwoPhaseCommit({
    expectedFingerprint: params.expectedFingerprint,
    actorId: actor,
    liveNodes: snapshot.nodes,
    liveEdges: snapshot.edges,
    releaseNodeId: snapshot.releaseNodeId,
    policy: snapshot.policy,
    ledger: snapshot.ledger,
    performTransition: async () => {
      await transitionAndCommentReleaseIssue({
        issueKey: releaseIssueKey,
        commentSummary: `Verified Release Gate ${snapshot.releaseNodeId} by ${actor} with fingerprint ${params.expectedFingerprint}.`,
      });
    },
  });

  const nextNodes = result.committed
    ? snapshot.nodes.map((n) =>
        n.id === snapshot.releaseNodeId
          ? { ...n, status: 'RELEASED' as const, approvedBy: actor }
          : n,
      )
    : snapshot.nodes;

  snapshot = {
    ...snapshot,
    nodes: nextNodes,
    ledger: nextLedger,
    lastSyncedAt: new Date().toISOString(),
  };
  await saveSnapshot(snapshot);

  const bundle = await getWorkspaceBundle(false);
  return {
    ...bundle,
    commitResult: result,
  };
}

export async function createRemediationTasksForBlockers(
  actor = 'TraceGate Agent / MCP',
): Promise<WorkspaceBundle & { createdKeys: string[] }> {
  let snapshot = await loadSnapshot();
  const evaluation = evaluateReleasePolicy(
    snapshot.nodes,
    snapshot.edges,
    snapshot.releaseNodeId,
    actor,
    snapshot.policy,
  );

  const createdKeys: string[] = [];
  for (const blocker of evaluation.blockers.slice(0, 3)) {
    const key = await createJiraIssue({
      projectKey: snapshot.projectKey,
      summary: `[TraceGate Remediation] ${blocker.externalId}: ${blocker.code}`,
      descriptionLines: [blocker.message, `Remediation: ${blocker.remediation}`],
      labels: ['tracegate-remediation'],
    });
    if (key) createdKeys.push(key);
  }

  const { nextLedger } = appendLedgerEntry(snapshot.ledger, {
    eventType: 'REMEDIATION_CREATED',
    actorId: actor,
    releaseId: snapshot.releaseNodeId,
    verdict: evaluation.verdict,
    evidenceFingerprint: evaluation.evidenceFingerprint,
    summary: `Created ${createdKeys.length > 0 ? createdKeys.join(', ') : evaluation.blockers.length + ' remediation task(s)'} for unresolved compliance blockers.`,
  });

  snapshot = { ...snapshot, ledger: nextLedger };
  await saveSnapshot(snapshot);

  const bundle = await getWorkspaceBundle(false);
  return { ...bundle, createdKeys };
}

export async function exportAuditPack(
  spaceId?: string,
): Promise<WorkspaceBundle & { exportedPageId: string | null }> {
  let snapshot = await loadSnapshot();
  const env = await fetchEnvironmentTargets();
  const targetSpaceId = spaceId ?? env.spaces[0]?.id ?? null;

  const evaluation = evaluateReleasePolicy(
    snapshot.nodes,
    snapshot.edges,
    snapshot.releaseNodeId,
    env.currentUser.displayName,
    snapshot.policy,
  );

  let exportedPageId: string | null = null;
  if (targetSpaceId) {
    exportedPageId = await exportConfluenceAuditPack({
      spaceId: targetSpaceId,
      snapshot,
      evaluation,
    });
  }

  const { nextLedger } = appendLedgerEntry(snapshot.ledger, {
    eventType: 'AUDIT_PACK_EXPORTED',
    actorId: env.currentUser.displayName,
    releaseId: snapshot.releaseNodeId,
    verdict: evaluation.verdict,
    evidenceFingerprint: evaluation.evidenceFingerprint,
    summary: exportedPageId
      ? `Exported Audit Evidence Pack to Confluence page ${exportedPageId}.`
      : 'Generated Audit Evidence Pack summary (Confluence not connected on site).',
  });

  snapshot = { ...snapshot, ledger: nextLedger };
  await saveSnapshot(snapshot);

  const bundle = await getWorkspaceBundle(false);
  return { ...bundle, exportedPageId };
}

export async function recordAgentToolInvocation(params: {
  toolName: string;
  actorId: string;
  summary: string;
}): Promise<WorkspaceBundle> {
  const snapshot = await loadSnapshot();
  const evaluation = evaluateReleasePolicy(
    snapshot.nodes,
    snapshot.edges,
    snapshot.releaseNodeId,
    params.actorId,
    snapshot.policy,
  );

  const { nextLedger } = appendLedgerEntry(snapshot.ledger, {
    eventType: 'AGENT_TOOL_CALL',
    actorId: params.actorId,
    releaseId: snapshot.releaseNodeId,
    verdict: evaluation.verdict,
    evidenceFingerprint: evaluation.evidenceFingerprint,
    summary: `[${params.toolName}] ${params.summary}`,
  });

  await saveSnapshot({ ...snapshot, ledger: nextLedger });
  return getWorkspaceBundle(false);
}
