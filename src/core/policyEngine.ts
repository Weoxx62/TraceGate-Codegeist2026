import { analyzeEvidenceGraph } from './graphEngine';
import { computeClauseDiffs, sha256Hex } from './normalizer';
import type {
  ClauseDiff,
  EvaluationResult,
  EvidenceEdge,
  EvidenceNode,
  GateVerdict,
  PolicyDefinition,
  PolicyFinding,
} from './types';

export const DEFAULT_POLICY: PolicyDefinition = {
  version: '2026.1-IEC62304',
  requireZeroHashDrift: true,
  requireCompleteTestCoverage: true,
  requireSegregationOfDuties: true,
  maxRpnWithoutVerification: 100,
  requireFreshVerificationAfterSpecChange: true,
};

/**
 * Computes a canonical SHA-256 fingerprint over the entire release graph state and policy.
 * Any mutation in any node hash, version, status, approver, or edge changes this fingerprint.
 */
export function computeEvidenceFingerprint(
  nodes: EvidenceNode[],
  edges: EvidenceEdge[],
  policy: PolicyDefinition,
): string {
  const canonicalNodes = [...nodes]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((n) => ({
      id: n.id,
      version: n.version,
      status: n.status,
      liveHash: n.liveHash,
      approvedHash: n.approvedHash,
      approvedBy: n.approvedBy,
      lastModifiedBy: n.lastModifiedBy,
      lastModifiedAt: n.lastModifiedAt,
    }));

  const canonicalEdges = [...edges]
    .sort((a, b) => `${a.fromId}->${a.toId}`.localeCompare(`${b.fromId}->${b.toId}`))
    .map((e) => `${e.fromId}:${e.relation}:${e.toId}`);

  return sha256Hex(
    JSON.stringify({
      policyVersion: policy.version,
      nodes: canonicalNodes,
      edges: canonicalEdges,
    }),
  );
}

/**
 * Evaluates a regulated release gate deterministically across all 6 Atlassian context pillars.
 */
export function evaluateReleasePolicy(
  nodes: EvidenceNode[],
  edges: EvidenceEdge[],
  releaseNodeId: string,
  actorId: string,
  policy: PolicyDefinition = DEFAULT_POLICY,
  evaluatedAt = new Date().toISOString(),
): EvaluationResult {
  const analysis = analyzeEvidenceGraph(nodes, edges);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const blockers: PolicyFinding[] = [];
  const warnings: PolicyFinding[] = [];
  const clauseDiffs: ClauseDiff[] = [];

  // 1. Cycle check
  for (const cycle of analysis.cycles) {
    blockers.push({
      code: 'GRAPH_CYCLE_CHECK',
      severity: 'BLOCKER',
      nodeId: cycle[0],
      externalId: nodeMap.get(cycle[0])?.externalId ?? cycle[0],
      message: `Circular traceability dependency detected: ${cycle.join(' -> ')}`,
      remediation: 'Remove the circular Jira/Confluence link so the evidence DAG remains acyclic.',
    });
  }

  // 2. Cryptographic Hash Drift Check
  for (const rootId of analysis.driftedRootIds) {
    const node = nodeMap.get(rootId)!;
    const diffs = computeClauseDiffs(
      node.approvedContentNormalized,
      node.contentNormalized,
      node.id,
      node.externalId,
    );
    clauseDiffs.push(...diffs);

    if (policy.requireZeroHashDrift) {
      const diffPreview =
        diffs.length > 0 && diffs[0].approvedLine && diffs[0].liveLine
          ? ` (${diffs[0].approvedLine} -> ${diffs[0].liveLine})`
          : '';
      blockers.push({
        code: 'HASH_DRIFT_CHECK',
        severity: 'BLOCKER',
        nodeId: node.id,
        externalId: node.externalId,
        message: `Cryptographic SHA-256 drift detected on ${node.externalId} (${node.title}) after QA sign-off${diffPreview}.`,
        remediation:
          'Re-verify downstream impacted tests and obtain independent QA co-signature for the updated specification.',
      });
    }
  }

  // 3. Downstream Suspect Link Propagation
  for (const impact of analysis.blastRadius) {
    const impactedNode = nodeMap.get(impact.nodeId);
    if (!impactedNode || impactedNode.id === releaseNodeId) continue;
    if (
      impactedNode.nodeType === 'VERIFICATION_TEST' ||
      impactedNode.nodeType === 'HAZARD_FMEA'
    ) {
      blockers.push({
        code: 'SUSPECT_LINK_PROPAGATION',
        severity: 'BLOCKER',
        nodeId: impactedNode.id,
        externalId: impactedNode.externalId,
        message: `${impactedNode.externalId} (${impactedNode.title}) is SUSPECT (hop ${impact.depth} along ${impact.provenancePath.join(' -> ')}).`,
        remediation: `Re-execute and re-certify ${impactedNode.externalId} against the latest upstream baseline.`,
      });
    }
  }

  // 4. Traceability Completeness & High-RPN FMEA Mitigations
  if (policy.requireCompleteTestCoverage) {
    for (const node of nodes) {
      const downstream = analysis.downstreamByNode.get(node.id) ?? [];
      if (node.nodeType === 'REQUIREMENT') {
        const linkedTests = downstream.filter(
          (d) => d.nodeType === 'VERIFICATION_TEST',
        );
        if (linkedTests.length === 0) {
          blockers.push({
            code: 'TRACEABILITY_COMPLETENESS',
            severity: 'BLOCKER',
            nodeId: node.id,
            externalId: node.externalId,
            message: `Requirement ${node.externalId} has zero linked verification tests.`,
            remediation: `Link at least one passed Verification Test to ${node.externalId}.`,
          });
        } else if (linkedTests.every((t) => t.status !== 'PASSED' && t.status !== 'CERTIFIED')) {
          warnings.push({
            code: 'TRACEABILITY_COMPLETENESS',
            severity: 'WARNING',
            nodeId: node.id,
            externalId: node.externalId,
            message: `Requirement ${node.externalId} has no PASSED/CERTIFIED verification test.`,
            remediation: `Complete verification testing for ${node.externalId}.`,
          });
        }
      }

      if (node.nodeType === 'HAZARD_FMEA' && node.rpn) {
        const rpnValue = node.rpn.severity * node.rpn.occurrence * node.rpn.detection;
        if (rpnValue >= policy.maxRpnWithoutVerification) {
          const verifiedTests = downstream.filter(
            (d) =>
              d.nodeType === 'VERIFICATION_TEST' &&
              (d.status === 'PASSED' || d.status === 'CERTIFIED') &&
              !analysis.suspectNodeIds.includes(d.id),
          );
          if (verifiedTests.length === 0) {
            blockers.push({
              code: 'TRACEABILITY_COMPLETENESS',
              severity: 'BLOCKER',
              nodeId: node.id,
              externalId: node.externalId,
              message: `Critical Hazard ${node.externalId} (RPN ${rpnValue}) lacks a valid non-suspect verification test.`,
              remediation: `Verify and certify a mitigation test for ${node.externalId}.`,
            });
          }
        }
      }
    }
  }

  // 5. Temporal Freshness
  if (policy.requireFreshVerificationAfterSpecChange) {
    for (const staleId of analysis.temporallyStaleIds) {
      if (analysis.blastRadius.some((b) => b.nodeId === staleId)) continue;
      const node = nodeMap.get(staleId)!;
      blockers.push({
        code: 'TEMPORAL_FRESHNESS',
        severity: 'BLOCKER',
        nodeId: node.id,
        externalId: node.externalId,
        message: `Test ${node.externalId} was signed before an upstream requirement/specification was modified.`,
        remediation: `Re-run ${node.externalId} after the latest specification timestamp.`,
      });
    }
  }

  // 6. Segregation of Duties (SoD)
  if (policy.requireSegregationOfDuties) {
    for (const node of nodes) {
      if (node.approvedBy && node.approvedBy === node.lastModifiedBy) {
        blockers.push({
          code: 'SEGREGATION_OF_DUTIES',
          severity: 'BLOCKER',
          nodeId: node.id,
          externalId: node.externalId,
          message: `Segregation of Duties violation on ${node.externalId}: author "${node.lastModifiedBy}" cannot self-certify their own change.`,
          remediation: `Require an independent QA reviewer (not "${node.lastModifiedBy}") to sign off ${node.externalId}.`,
        });
      }
    }

    const releaseNode = nodeMap.get(releaseNodeId);
    const uncertifiedAuthors = new Set(
      analysis.driftedRootIds
        .map((id) => nodeMap.get(id)?.lastModifiedBy)
        .filter((v): v is string => Boolean(v)),
    );
    if (releaseNode && uncertifiedAuthors.has(actorId)) {
      warnings.push({
        code: 'SEGREGATION_OF_DUTIES',
        severity: 'WARNING',
        nodeId: releaseNode.id,
        externalId: releaseNode.externalId,
        message: `Current actor "${actorId}" modified an upstream drifted spec and is blocked from self-approving QA sign-off.`,
        remediation: 'Request an independent QA co-signature before executing release commit.',
      });
    }
  }

  // Deterministic confidence score (0-100)
  let score = 100;
  score -= analysis.driftedRootIds.length * 24;
  score -= analysis.suspectNodeIds.length * 9;
  score -= blockers.filter((b) => b.code === 'TRACEABILITY_COMPLETENESS').length * 14;
  score -= blockers.filter((b) => b.code === 'SEGREGATION_OF_DUTIES').length * 18;
  score -= blockers.filter((b) => b.code === 'GRAPH_CYCLE_CHECK').length * 25;
  score -= warnings.length * 4;
  const confidenceScore = Math.max(4, Math.min(100, score));

  let verdict: GateVerdict = 'ALLOW';
  if (blockers.length > 0) {
    verdict = 'BLOCK';
  } else if (warnings.length > 0) {
    verdict = 'NEEDS_REVIEW';
  }

  return {
    releaseId: releaseNodeId,
    verdict,
    confidenceScore,
    evidenceFingerprint: computeEvidenceFingerprint(nodes, edges, policy),
    evaluatedAt,
    blockers,
    warnings,
    blastRadius: analysis.blastRadius,
    clauseDiffs,
    fmeaExposureTotal: analysis.fmeaExposureTotal,
    driftedRootIds: analysis.driftedRootIds,
    suspectNodeIds: analysis.suspectNodeIds,
    cycles: analysis.cycles,
  };
}
