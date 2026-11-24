/**
 * Core domain types for TraceGate's deterministic traceability,
 * cryptographic drift detection, policy evaluation, and two-phase commit engine.
 */

export type ContextPillar =
  | 'KNOWLEDGE'
  | 'WORK'
  | 'RISK_ASSET'
  | 'PEOPLE'
  | 'COMMUNICATION'
  | 'CODE';

export type SourceProduct = 'JIRA' | 'CONFLUENCE' | 'ARTIFACT';

export type NodeType =
  | 'SPEC_CLAUSE'
  | 'REQUIREMENT'
  | 'HAZARD_FMEA'
  | 'VERIFICATION_TEST'
  | 'RELEASE_GATE'
  | 'FIRMWARE_ARTIFACT';

export type NodeStatus =
  | 'CERTIFIED'
  | 'PASSED'
  | 'SUSPECT'
  | 'DRIFTED'
  | 'OPEN'
  | 'BLOCKED'
  | 'RELEASED';

export type EdgeRelation =
  | 'GOVERNS'
  | 'MITIGATES'
  | 'VERIFIES'
  | 'GATES'
  | 'BUILT_IN';

export interface RpnScore {
  severity: number;
  occurrence: number;
  detection: number;
}

export interface EvidenceNode {
  id: string;
  externalId: string;
  sourceProduct: SourceProduct;
  pillar: ContextPillar;
  nodeType: NodeType;
  title: string;
  status: NodeStatus;
  version: number;
  rawContent: string;
  contentNormalized: string;
  approvedContentNormalized: string | null;
  liveHash: string;
  approvedHash: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  lastModifiedBy: string;
  lastModifiedAt: string;
  url?: string;
  rpn?: RpnScore;
}

export interface EvidenceEdge {
  fromId: string;
  toId: string;
  relation: EdgeRelation;
}

export interface PolicyDefinition {
  version: string;
  requireZeroHashDrift: boolean;
  requireCompleteTestCoverage: boolean;
  requireSegregationOfDuties: boolean;
  maxRpnWithoutVerification: number;
  requireFreshVerificationAfterSpecChange: boolean;
}

export type PolicyRuleCode =
  | 'HASH_DRIFT_CHECK'
  | 'SUSPECT_LINK_PROPAGATION'
  | 'TRACEABILITY_COMPLETENESS'
  | 'TEMPORAL_FRESHNESS'
  | 'SEGREGATION_OF_DUTIES'
  | 'GRAPH_CYCLE_CHECK';

export interface PolicyFinding {
  code: PolicyRuleCode;
  severity: 'BLOCKER' | 'WARNING';
  nodeId: string;
  externalId: string;
  message: string;
  remediation: string;
}

export interface BlastImpact {
  nodeId: string;
  externalId: string;
  title: string;
  nodeType: NodeType;
  pillar: ContextPillar;
  depth: number;
  provenancePath: string[];
  weightedRisk: number;
}

export interface ClauseDiff {
  clauseKey: string;
  changeType: 'MODIFIED' | 'ADDED' | 'REMOVED';
  approvedLine: string | null;
  liveLine: string | null;
  nodeId: string;
  externalId: string;
}

export type GateVerdict = 'ALLOW' | 'NEEDS_REVIEW' | 'BLOCK';

export interface EvaluationResult {
  releaseId: string;
  verdict: GateVerdict;
  confidenceScore: number;
  evidenceFingerprint: string;
  evaluatedAt: string;
  blockers: PolicyFinding[];
  warnings: PolicyFinding[];
  blastRadius: BlastImpact[];
  clauseDiffs: ClauseDiff[];
  fmeaExposureTotal: number;
  driftedRootIds: string[];
  suspectNodeIds: string[];
  cycles: string[][];
}

export type LedgerEventType =
  | 'DEMO_SEEDED'
  | 'SPEC_DRIFT_DETECTED'
  | 'QA_CERTIFICATION_GRANTED'
  | 'SOD_VIOLATION_BLOCKED'
  | 'COMMIT_EXECUTED'
  | 'COMMIT_REJECTED_EVIDENCE_CHANGED'
  | 'COMMIT_REJECTED_POLICY_BLOCK'
  | 'AGENT_TOOL_CALL'
  | 'REMEDIATION_CREATED'
  | 'AUDIT_PACK_EXPORTED';

export interface LedgerEntryPayload {
  eventType: LedgerEventType;
  actorId: string;
  releaseId: string;
  verdict: GateVerdict;
  evidenceFingerprint: string;
  summary: string;
  details?: Record<string, unknown>;
}

export interface LedgerEntry {
  index: number;
  timestamp: string;
  prevHash: string;
  entryHash: string;
  payload: LedgerEntryPayload;
}

export interface LedgerVerificationResult {
  valid: boolean;
  totalEntries: number;
  brokenAtIndex: number | null;
  expectedHash: string | null;
  actualHash: string | null;
}

export type IndustryPreset =
  | 'MEDTECH_IEC62304'
  | 'FINTECH_DORA'
  | 'AUTOMOTIVE_ISO26262';

export interface EvidenceGraphSnapshot {
  workspaceKey: string;
  projectKey: string;
  confluenceSpaceKey: string | null;
  industryPreset?: IndustryPreset;
  scenarioTitle: string;
  releaseNodeId: string;
  policy: PolicyDefinition;
  nodes: EvidenceNode[];
  edges: EvidenceEdge[];
  ledger: LedgerEntry[];
  seededJiraIssueKeys: Record<string, string>;
  seededConfluencePageId: string | null;
  lastSyncedAt: string;
}

export interface CommitGateResult {
  committed: boolean;
  reasonCode:
    | 'COMMIT_EXECUTED'
    | 'COMMIT_REJECTED_EVIDENCE_CHANGED'
    | 'COMMIT_REJECTED_POLICY_BLOCK';
  message: string;
  evaluation: EvaluationResult;
  ledgerEntry: LedgerEntry;
}
