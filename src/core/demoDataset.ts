import { appendLedgerEntry } from './auditLedger';
import { reconcileGraphNodeStatuses } from './graphEngine';
import { hashSpecContent } from './normalizer';
import { DEFAULT_POLICY, evaluateReleasePolicy } from './policyEngine';
import type {
  EvidenceEdge,
  EvidenceGraphSnapshot,
  EvidenceNode,
  IndustryPreset,
  LedgerEntry,
  RpnScore,
} from './types';

export const DEMO_USERS = {
  AUTHOR: 'Dr. Elena Rostova (Systems Eng)',
  QA_LEAD: 'Marcus Vance (Lead QA)',
  RELEASE_MGR: 'Claire Moreau (Release Ops)',
} as const;

export interface PresetConfig {
  id: IndustryPreset;
  label: string;
  standard: string;
  scenarioTitle: string;
  defaultProjectKey: string;
  defaultSpaceKey: string;
  primarySpecTitle: string;
  primaryClauseKey: string;
  approvedSpecText: string;
  driftedSpecText: string;
  approvedDriftValue: string;
  driftedValue: string;
  nextTamperValue: string;
  secondarySpecTitle: string;
  secondarySpecText: string;
  req1Title: string;
  req1Text: string;
  req2Title: string;
  req2Text: string;
  hazardTitle: string;
  hazardText: string;
  hazardRpn: RpnScore;
  test1Title: string;
  test1Text: string;
  test2Title: string;
  test2Text: string;
  test3Title: string;
  test3Text: string;
  artifactExternalId: string;
  artifactTitle: string;
  artifactText: string;
  releaseTitle: string;
  releaseText: string;
}

export const INDUSTRY_PRESETS: Record<IndustryPreset, PresetConfig> = {
  MEDTECH_IEC62304: {
    id: 'MEDTECH_IEC62304',
    label: 'MedTech — IEC 62304 / FDA',
    standard: 'IEC 62304 Class C',
    scenarioTitle: 'CardioPulse Gen-4 Insulin Pump — Firmware v2.4',
    defaultProjectKey: 'MED',
    defaultSpaceKey: 'MEDTECH',
    primarySpecTitle: 'Dosimetry Safety Specification (Insulin Pump v2.4)',
    primaryClauseKey: 'CLAUSE-BOLUS-01',
    approvedDriftValue: '10U',
    driftedValue: '15U',
    nextTamperValue: '22U',
    approvedSpecText: [
      'CardioPulse Gen-4 Insulin Pump — Dosimetry Safety Specification v2.4',
      '[CLAUSE-BOLUS-01] Max Single Bolus Limit: 10U',
      '[CLAUSE-OCCLUSION-02] Downstream Occlusion Alarm Latency: <= 1200ms',
      '[CLAUSE-FAILSAFE-03] Dual-MCU Watchdog Cutoff: Active (< 50ms hardware trip)',
    ].join('\n'),
    driftedSpecText: [
      'CardioPulse Gen-4 Insulin Pump — Dosimetry Safety Specification v2.4',
      '[CLAUSE-BOLUS-01] Max Single Bolus Limit: 15U',
      '[CLAUSE-OCCLUSION-02] Downstream Occlusion Alarm Latency: <= 1200ms',
      '[CLAUSE-FAILSAFE-03] Dual-MCU Watchdog Cutoff: Active (< 50ms hardware trip)',
    ].join('\n'),
    secondarySpecTitle: 'Occlusion & Battery Fault Alarm Protocol',
    secondarySpecText:
      '[CLAUSE-ALARM-01] Audible Piezo Alert >= 65 dBA at 1m\n[CLAUSE-ALARM-02] Telemetry Push within 3000ms',
    req1Title: 'Enforce Hardware & Firmware Single-Bolus Ceiling',
    req1Text: '[REQ-101] Firmware must clamp single-bolus delivery strictly to Dosimetry SOP limit.',
    req2Title: 'Trigger Occlusion Fault Lockout Under 1200ms',
    req2Text: '[REQ-102] Stepper back-pressure sensor trips motor cutoff and piezo alarm within 1200ms.',
    hazardTitle: 'FMEA Hazard: Unintended Insulin Over-Infusion (Class C)',
    hazardText: '[HAZARD-301] Severe hypoglycemia risk if bolus ceiling exceeds clinical calibration.',
    hazardRpn: { severity: 10, occurrence: 3, detection: 6 },
    test1Title: 'HIL Bench Test: Bolus Ceiling & Watchdog Cutoff',
    test1Text: '[TEST-401] Verified bolus cutoff against approved spec baseline. Outcome: PASSED.',
    test2Title: 'Acoustic & Pressure Sensor Occlusion Verification',
    test2Text: '[TEST-402] Verified 980ms trip latency and 68 dBA piezo output. Outcome: PASSED.',
    test3Title: 'ECO Clinical Review Sign-Off & Dosage Soak Test',
    test3Text: '[TEST-403] 72-hour soak verification and clinical review thread. Outcome: PASSED.',
    artifactExternalId: 'FW-CardioPulse-2.4.0',
    artifactTitle: 'Signed Pump Firmware Build v2.4.0-rc3',
    artifactText: 'artifact=cardiopulse-fw-2.4.0-rc3.bin sha=a91f4c82 target=STM32U5',
    releaseTitle: 'Release Gate: CardioPulse Gen-4 Firmware v2.4',
    releaseText: '[REL-240] Production release gate for CardioPulse Gen-4 Insulin Pump v2.4.',
  },
  FINTECH_DORA: {
    id: 'FINTECH_DORA',
    label: 'FinTech — DORA / SOC2 Core',
    standard: 'EU DORA ICT Risk',
    scenarioTitle: 'EuroClear InstantSEPA Settlement Core — v5.1',
    defaultProjectKey: 'FIN',
    defaultSpaceKey: 'DORA',
    primarySpecTitle: 'Instant Settlement & AML Circuit-Breaker Policy v5.1',
    primaryClauseKey: 'CLAUSE-AML-01',
    approvedDriftValue: 'EUR 10000',
    driftedValue: 'EUR 50000',
    nextTamperValue: 'EUR 100000',
    approvedSpecText: [
      'EuroClear InstantSEPA Settlement Core — ICT Risk Policy v5.1',
      '[CLAUSE-AML-01] Instant Wire Circuit-Breaker Ceiling: EUR 10000',
      '[CLAUSE-RECON-02] Ledger Idempotency Window: <= 250ms',
      '[CLAUSE-DORA-03] Dual-Signature HSM Key Custody: Enforced',
    ].join('\n'),
    driftedSpecText: [
      'EuroClear InstantSEPA Settlement Core — ICT Risk Policy v5.1',
      '[CLAUSE-AML-01] Instant Wire Circuit-Breaker Ceiling: EUR 50000',
      '[CLAUSE-RECON-02] Ledger Idempotency Window: <= 250ms',
      '[CLAUSE-DORA-03] Dual-Signature HSM Key Custody: Enforced',
    ].join('\n'),
    secondarySpecTitle: 'HSM Key Rotation & Settlement Failover Runbook',
    secondarySpecText:
      '[CLAUSE-HSM-01] Multi-Region Active-Passive Failover <= 15s\n[CLAUSE-HSM-02] Audit Log Retention >= 7 years',
    req1Title: 'Enforce Pre-Settlement AML Circuit-Breaker Threshold',
    req1Text: '[REQ-101] Settlement router must hold wires above AML ceiling for dual compliance review.',
    req2Title: 'Guarantee Deterministic Active-Passive Failover Under 15s',
    req2Text: '[REQ-102] Standby clearing node assumes SEPA queue within 15s with zero duplicate debits.',
    hazardTitle: 'FMEA Hazard: Unchecked High-Value Fraud Settlement (DORA Critical)',
    hazardText: '[HAZARD-301] Regulatory breach and liquidity loss if AML circuit-breaker threshold rises unverified.',
    hazardRpn: { severity: 10, occurrence: 3, detection: 7 },
    test1Title: 'Chaos & AML Threshold Stress Suite (10k TPS)',
    test1Text: '[TEST-401] Verified circuit-breaker trigger on synthetic SEPA batch. Outcome: PASSED.',
    test2Title: 'Multi-Region Clearing Failover Drill',
    test2Text: '[TEST-402] Verified 11.4s failover with zero ledger drift. Outcome: PASSED.',
    test3Title: 'Compliance Officer Change Advisory Sign-Off',
    test3Text: '[TEST-403] DORA ICT change review and dual-control verification. Outcome: PASSED.',
    artifactExternalId: 'SVC-InstantSEPA-5.1.0',
    artifactTitle: 'Signed Settlement Engine Container v5.1.0',
    artifactText: 'image=euroclear/instant-sepa:5.1.0 digest=sha256:9d31b8e2',
    releaseTitle: 'Release Gate: InstantSEPA Settlement Core v5.1',
    releaseText: '[REL-240] Production clearing release gate under EU DORA controls.',
  },
  AUTOMOTIVE_ISO26262: {
    id: 'AUTOMOTIVE_ISO26262',
    label: 'Automotive — ISO 26262 ASIL-D',
    standard: 'ISO 26262 ASIL-D',
    scenarioTitle: 'DriveShield ADAS Emergency Braking — ECU v3.2',
    defaultProjectKey: 'AUTO',
    defaultSpaceKey: 'ADAS',
    primarySpecTitle: 'AEB Sensor Fusion & Braking Latency Spec v3.2',
    primaryClauseKey: 'CLAUSE-AEB-01',
    approvedDriftValue: '<= 45ms',
    driftedValue: '<= 85ms',
    nextTamperValue: '<= 120ms',
    approvedSpecText: [
      'DriveShield ADAS Autonomous Emergency Braking — System Spec v3.2',
      '[CLAUSE-AEB-01] Lidar-to-Actuator Brake Latency Budget: <= 45ms',
      '[CLAUSE-RADAR-02] Cross-Validation Confidence Floor: >= 0.92',
      '[CLAUSE-ASIL-03] Lockstep R52 Safety Core Watchdog: Enabled',
    ].join('\n'),
    driftedSpecText: [
      'DriveShield ADAS Autonomous Emergency Braking — System Spec v3.2',
      '[CLAUSE-AEB-01] Lidar-to-Actuator Brake Latency Budget: <= 85ms',
      '[CLAUSE-RADAR-02] Cross-Validation Confidence Floor: >= 0.92',
      '[CLAUSE-ASIL-03] Lockstep R52 Safety Core Watchdog: Enabled',
    ].join('\n'),
    secondarySpecTitle: 'CAN-FD Bus Fault & Safe-Stop Degradation Spec',
    secondarySpecText:
      '[CLAUSE-CAN-01] Redundant CAN-FD Fallback <= 10ms\n[CLAUSE-CAN-02] Instrument Cluster Fault DTC Logged',
    req1Title: 'Guarantee Deterministic AEB Braking Pipeline Within Latency Budget',
    req1Text: '[REQ-101] Sensor fusion and hydraulic brake command must complete within ASIL-D latency budget.',
    req2Title: 'Switch to Redundant CAN-FD Channel on Primary Bus Loss',
    req2Text: '[REQ-102] ECU transitions to backup CAN-FD channel within 10ms of CRC burst.',
    hazardTitle: 'FMEA Hazard: Delayed Autonomous Braking at Highway Speed (ASIL-D)',
    hazardText: '[HAZARD-301] Extended braking latency increases collision impact energy.',
    hazardRpn: { severity: 10, occurrence: 4, detection: 6 },
    test1Title: 'Hardware-in-the-Loop (HIL) Track Timing Verification',
    test1Text: '[TEST-401] Verified worst-case execution time against latency budget. Outcome: PASSED.',
    test2Title: 'CAN-FD Fault Injection Bench Test',
    test2Text: '[TEST-402] Verified 6.2ms redundant bus switchover. Outcome: PASSED.',
    test3Title: 'Functional Safety Assessor Sign-Off (ASIL-D)',
    test3Text: '[TEST-403] Safety case review and ISO 26262 audit checklist. Outcome: PASSED.',
    artifactExternalId: 'ECU-DriveShield-3.2.0',
    artifactTitle: 'Signed Safety ECU Binary v3.2.0',
    artifactText: 'ecu=driveshield-aeb-3.2.0.elf crc32=7f22e901 core=R52-Lockstep',
    releaseTitle: 'Release Gate: DriveShield AEB ECU v3.2',
    releaseText: '[REL-240] SOP release gate for DriveShield ADAS Emergency Braking v3.2.',
  },
};

function buildNode(
  partial: Omit<EvidenceNode, 'contentNormalized' | 'approvedContentNormalized' | 'liveHash' | 'approvedHash'> & {
    approvedRawContent?: string | null;
  },
): EvidenceNode {
  const live = hashSpecContent(partial.rawContent);
  const approved =
    partial.approvedRawContent !== undefined && partial.approvedRawContent !== null
      ? hashSpecContent(partial.approvedRawContent)
      : null;

  return {
    id: partial.id,
    externalId: partial.externalId,
    sourceProduct: partial.sourceProduct,
    pillar: partial.pillar,
    nodeType: partial.nodeType,
    title: partial.title,
    status: partial.status,
    version: partial.version,
    rawContent: partial.rawContent,
    contentNormalized: live.normalizedText,
    approvedContentNormalized: approved ? approved.normalizedText : null,
    liveHash: live.hash,
    approvedHash: approved ? approved.hash : null,
    approvedBy: partial.approvedBy,
    approvedAt: partial.approvedAt,
    lastModifiedBy: partial.lastModifiedBy,
    lastModifiedAt: partial.lastModifiedAt,
    url: partial.url,
    rpn: partial.rpn,
  };
}

/**
 * Generates a realistic regulated industry compliance graph across all 6 Atlassian context pillars
 * using the selected Specialized Industry preset (`MEDTECH_IEC62304`, `FINTECH_DORA`, or `AUTOMOTIVE_ISO26262`).
 */
export function buildIndustryDemoSnapshot(
  presetId: IndustryPreset = 'MEDTECH_IEC62304',
  mode: 'DRIFTED' | 'CERTIFIED' = 'DRIFTED',
  options?: {
    workspaceKey?: string;
    projectKey?: string;
    confluenceSpaceKey?: string | null;
    currentActorName?: string;
  },
): EvidenceGraphSnapshot {
  const preset = INDUSTRY_PRESETS[presetId] ?? INDUSTRY_PRESETS.MEDTECH_IEC62304;
  const projectKey = options?.projectKey ?? preset.defaultProjectKey;
  const confluenceSpaceKey = options?.confluenceSpaceKey ?? preset.defaultSpaceKey;
  const workspaceKey = options?.workspaceKey ?? 'standalone-preview';
  const driftEditor = options?.currentActorName ?? DEMO_USERS.AUTHOR;

  const approvedSpecRaw = preset.approvedSpecText;
  const liveSpecRaw = mode === 'DRIFTED' ? preset.driftedSpecText : approvedSpecRaw;

  const tBase = '2026-11-22T09:00:00.000Z';
  const tQaCertified = '2026-11-23T14:30:00.000Z';
  const tDrift = '2026-11-24T11:15:00.000Z';

  const isDrifted = mode === 'DRIFTED';

  const nodes: EvidenceNode[] = [
    buildNode({
      id: 'SPEC-BOLUS',
      externalId: 'CONF-SOP-204',
      sourceProduct: 'CONFLUENCE',
      pillar: 'KNOWLEDGE',
      nodeType: 'SPEC_CLAUSE',
      title: preset.primarySpecTitle,
      status: isDrifted ? 'DRIFTED' : 'CERTIFIED',
      version: isDrifted ? 4 : 3,
      rawContent: liveSpecRaw,
      approvedRawContent: approvedSpecRaw,
      approvedBy: DEMO_USERS.QA_LEAD,
      approvedAt: tQaCertified,
      lastModifiedBy: isDrifted ? driftEditor : DEMO_USERS.AUTHOR,
      lastModifiedAt: isDrifted ? tDrift : tBase,
    }),
    buildNode({
      id: 'SPEC-ALARM',
      externalId: 'CONF-SOP-209',
      sourceProduct: 'CONFLUENCE',
      pillar: 'KNOWLEDGE',
      nodeType: 'SPEC_CLAUSE',
      title: preset.secondarySpecTitle,
      status: 'CERTIFIED',
      version: 2,
      rawContent: preset.secondarySpecText,
      approvedRawContent: preset.secondarySpecText,
      approvedBy: DEMO_USERS.QA_LEAD,
      approvedAt: tQaCertified,
      lastModifiedBy: DEMO_USERS.AUTHOR,
      lastModifiedAt: tBase,
    }),
    buildNode({
      id: 'REQ-101',
      externalId: `${projectKey}-101`,
      sourceProduct: 'JIRA',
      pillar: 'WORK',
      nodeType: 'REQUIREMENT',
      title: preset.req1Title,
      status: isDrifted ? 'SUSPECT' : 'CERTIFIED',
      version: 3,
      rawContent: preset.req1Text,
      approvedRawContent: preset.req1Text,
      approvedBy: DEMO_USERS.QA_LEAD,
      approvedAt: tQaCertified,
      lastModifiedBy: DEMO_USERS.AUTHOR,
      lastModifiedAt: tBase,
    }),
    buildNode({
      id: 'REQ-102',
      externalId: `${projectKey}-102`,
      sourceProduct: 'JIRA',
      pillar: 'WORK',
      nodeType: 'REQUIREMENT',
      title: preset.req2Title,
      status: 'CERTIFIED',
      version: 2,
      rawContent: preset.req2Text,
      approvedRawContent: preset.req2Text,
      approvedBy: DEMO_USERS.QA_LEAD,
      approvedAt: tQaCertified,
      lastModifiedBy: DEMO_USERS.AUTHOR,
      lastModifiedAt: tBase,
    }),
    buildNode({
      id: 'FMEA-301',
      externalId: `${projectKey}-301`,
      sourceProduct: 'JIRA',
      pillar: 'RISK_ASSET',
      nodeType: 'HAZARD_FMEA',
      title: preset.hazardTitle,
      status: isDrifted ? 'SUSPECT' : 'CERTIFIED',
      version: 2,
      rawContent: preset.hazardText,
      approvedRawContent: preset.hazardText,
      approvedBy: DEMO_USERS.QA_LEAD,
      approvedAt: tQaCertified,
      lastModifiedBy: DEMO_USERS.AUTHOR,
      lastModifiedAt: tBase,
      rpn: preset.hazardRpn,
    }),
    buildNode({
      id: 'TEST-401',
      externalId: `${projectKey}-401`,
      sourceProduct: 'JIRA',
      pillar: 'WORK',
      nodeType: 'VERIFICATION_TEST',
      title: preset.test1Title,
      status: isDrifted ? 'SUSPECT' : 'PASSED',
      version: 3,
      rawContent: preset.test1Text,
      approvedRawContent: preset.test1Text,
      approvedBy: DEMO_USERS.QA_LEAD,
      approvedAt: tQaCertified,
      lastModifiedBy: DEMO_USERS.AUTHOR,
      lastModifiedAt: tBase,
    }),
    buildNode({
      id: 'TEST-402',
      externalId: `${projectKey}-402`,
      sourceProduct: 'JIRA',
      pillar: 'WORK',
      nodeType: 'VERIFICATION_TEST',
      title: preset.test2Title,
      status: 'PASSED',
      version: 2,
      rawContent: preset.test2Text,
      approvedRawContent: preset.test2Text,
      approvedBy: DEMO_USERS.QA_LEAD,
      approvedAt: tQaCertified,
      lastModifiedBy: DEMO_USERS.AUTHOR,
      lastModifiedAt: tBase,
    }),
    buildNode({
      id: 'TEST-403',
      externalId: `${projectKey}-403`,
      sourceProduct: 'JIRA',
      pillar: 'COMMUNICATION',
      nodeType: 'VERIFICATION_TEST',
      title: preset.test3Title,
      status: isDrifted ? 'SUSPECT' : 'PASSED',
      version: 2,
      rawContent: preset.test3Text,
      approvedRawContent: preset.test3Text,
      approvedBy: DEMO_USERS.QA_LEAD,
      approvedAt: tQaCertified,
      lastModifiedBy: DEMO_USERS.AUTHOR,
      lastModifiedAt: tBase,
    }),
    buildNode({
      id: 'FW-240',
      externalId: preset.artifactExternalId,
      sourceProduct: 'ARTIFACT',
      pillar: 'CODE',
      nodeType: 'FIRMWARE_ARTIFACT',
      title: preset.artifactTitle,
      status: isDrifted ? 'SUSPECT' : 'CERTIFIED',
      version: 1,
      rawContent: preset.artifactText,
      approvedRawContent: preset.artifactText,
      approvedBy: DEMO_USERS.QA_LEAD,
      approvedAt: tQaCertified,
      lastModifiedBy: DEMO_USERS.AUTHOR,
      lastModifiedAt: tBase,
    }),
    buildNode({
      id: 'REL-240',
      externalId: `${projectKey}-240`,
      sourceProduct: 'JIRA',
      pillar: 'PEOPLE',
      nodeType: 'RELEASE_GATE',
      title: preset.releaseTitle,
      status: isDrifted ? 'BLOCKED' : 'OPEN',
      version: 1,
      rawContent: preset.releaseText,
      approvedRawContent: null,
      approvedBy: null,
      approvedAt: null,
      lastModifiedBy: DEMO_USERS.RELEASE_MGR,
      lastModifiedAt: tQaCertified,
    }),
  ];

  const edges: EvidenceEdge[] = [
    { fromId: 'SPEC-BOLUS', toId: 'REQ-101', relation: 'GOVERNS' },
    { fromId: 'SPEC-BOLUS', toId: 'FMEA-301', relation: 'GOVERNS' },
    { fromId: 'SPEC-ALARM', toId: 'REQ-102', relation: 'GOVERNS' },
    { fromId: 'REQ-101', toId: 'TEST-401', relation: 'VERIFIES' },
    { fromId: 'REQ-101', toId: 'TEST-403', relation: 'VERIFIES' },
    { fromId: 'FMEA-301', toId: 'TEST-401', relation: 'MITIGATES' },
    { fromId: 'REQ-102', toId: 'TEST-402', relation: 'VERIFIES' },
    { fromId: 'TEST-401', toId: 'FW-240', relation: 'BUILT_IN' },
    { fromId: 'TEST-402', toId: 'FW-240', relation: 'BUILT_IN' },
    { fromId: 'TEST-403', toId: 'FW-240', relation: 'BUILT_IN' },
    { fromId: 'FW-240', toId: 'REL-240', relation: 'GATES' },
    { fromId: 'FMEA-301', toId: 'REL-240', relation: 'GATES' },
  ];

  const cleanEval = evaluateReleasePolicy(
    nodes,
    edges,
    'REL-240',
    DEMO_USERS.RELEASE_MGR,
    DEFAULT_POLICY,
    tQaCertified,
  );

  let ledger: LedgerEntry[] = [];
  const seededEntry = appendLedgerEntry(
    ledger,
    {
      eventType: 'DEMO_SEEDED',
      actorId: DEMO_USERS.RELEASE_MGR,
      releaseId: 'REL-240',
      verdict: 'ALLOW',
      evidenceFingerprint: cleanEval.evidenceFingerprint,
      summary: `Initialized ${preset.scenarioTitle} (${preset.standard}) with QA-certified baseline (${preset.approvedDriftValue}).`,
    },
    tQaCertified,
  );
  ledger = seededEntry.nextLedger;

  if (isDrifted) {
    const driftEntry = appendLedgerEntry(
      ledger,
      {
        eventType: 'SPEC_DRIFT_DETECTED',
        actorId: driftEditor,
        releaseId: 'REL-240',
        verdict: cleanEval.verdict,
        evidenceFingerprint: cleanEval.evidenceFingerprint,
        summary: `Silent Confluence SOP drift detected on CONF-SOP-204: ${preset.primaryClauseKey} changed ${preset.approvedDriftValue} -> ${preset.driftedValue} after QA sign-off.`,
        details: {
          clause: preset.primaryClauseKey,
          previousValue: preset.approvedDriftValue,
          liveValue: preset.driftedValue,
        },
      },
      tDrift,
    );
    ledger = driftEntry.nextLedger;
  }

  return {
    workspaceKey,
    projectKey,
    confluenceSpaceKey,
    industryPreset: preset.id,
    scenarioTitle: preset.scenarioTitle,
    releaseNodeId: 'REL-240',
    policy: DEFAULT_POLICY,
    nodes,
    edges,
    ledger,
    seededJiraIssueKeys: {},
    seededConfluencePageId: null,
    lastSyncedAt: isDrifted ? tDrift : tQaCertified,
  };
}

export function buildMedTechDemoSnapshot(
  mode: 'DRIFTED' | 'CERTIFIED' = 'DRIFTED',
  options?: {
    workspaceKey?: string;
    projectKey?: string;
    confluenceSpaceKey?: string | null;
    currentActorName?: string;
  },
): EvidenceGraphSnapshot {
  return buildIndustryDemoSnapshot('MEDTECH_IEC62304', mode, options);
}

/**
 * Updates any evidence node's raw content live and recomputes its normalized SHA-256 hash.
 * Cosmetic formatting changes keep `hashChanged === false` (zero false positives).
 */
export function updateNodeRawContent(
  snapshot: EvidenceGraphSnapshot,
  nodeId: string,
  newRawContent: string,
  editorName: string,
  nowIso = new Date().toISOString(),
): {
  snapshot: EvidenceGraphSnapshot;
  hashChanged: boolean;
  message: string;
} {
  const target = snapshot.nodes.find((n) => n.id === nodeId);
  if (!target) {
    return {
      snapshot,
      hashChanged: false,
      message: `Node ${nodeId} not found in graph.`,
    };
  }

  const hashed = hashSpecContent(newRawContent);
  const hashChanged = hashed.hash !== target.liveHash;

  if (!hashChanged) {
    const nextNodes = snapshot.nodes.map((node) =>
      node.id === nodeId
        ? { ...node, rawContent: newRawContent }
        : node,
    );
    return {
      snapshot: { ...snapshot, nodes: nextNodes, lastSyncedAt: nowIso },
      hashChanged: false,
      message: `Cosmetic formatting edit on ${target.externalId} normalized — SHA-256 unchanged (${hashed.hash.slice(0, 12)}). Zero false positives.`,
    };
  }

  const rawNextNodes = snapshot.nodes.map((node) => {
    if (node.id !== nodeId) return node;
    const isNowDrifted =
      node.approvedHash !== null && hashed.hash !== node.approvedHash;
    return {
      ...node,
      version: node.version + 1,
      status: isNowDrifted ? ('DRIFTED' as const) : ('CERTIFIED' as const),
      rawContent: newRawContent,
      contentNormalized: hashed.normalizedText,
      liveHash: hashed.hash,
      lastModifiedBy: editorName,
      lastModifiedAt: nowIso,
    };
  });

  const nextNodes = reconcileGraphNodeStatuses(
    rawNextNodes,
    snapshot.edges,
    snapshot.releaseNodeId,
  );

  const nextEval = evaluateReleasePolicy(
    nextNodes,
    snapshot.edges,
    snapshot.releaseNodeId,
    editorName,
    snapshot.policy,
    nowIso,
  );

  const { nextLedger } = appendLedgerEntry(
    snapshot.ledger,
    {
      eventType: 'SPEC_DRIFT_DETECTED',
      actorId: editorName,
      releaseId: snapshot.releaseNodeId,
      verdict: nextEval.verdict,
      evidenceFingerprint: nextEval.evidenceFingerprint,
      summary: `Live edit on ${target.externalId} mutated SHA-256 (${hashed.hash.slice(0, 12)}). ${nextEval.blastRadius.length} downstream artifacts marked SUSPECT.`,
    },
    nowIso,
  );

  return {
    snapshot: {
      ...snapshot,
      nodes: nextNodes,
      ledger: nextLedger,
      lastSyncedAt: nowIso,
    },
    hashChanged: true,
    message: `Normative change detected on ${target.externalId}: SHA-256 mutated (${hashed.hash.slice(0, 12)}). Verdict: ${nextEval.verdict} (${nextEval.confidenceScore}%).`,
  };
}

/**
 * Simulates an engineering edit to the primary Confluence SOP based on the active industry preset.
 */
export function applySpecTampering(
  snapshot: EvidenceGraphSnapshot,
  customThresholdValue: string | undefined,
  editorName: string,
  nowIso = new Date().toISOString(),
): EvidenceGraphSnapshot {
  const preset =
    INDUSTRY_PRESETS[snapshot.industryPreset ?? 'MEDTECH_IEC62304'] ??
    INDUSTRY_PRESETS.MEDTECH_IEC62304;
  const replacement = customThresholdValue ?? preset.nextTamperValue;
  const nextRaw = preset.approvedSpecText.replace(
    preset.approvedDriftValue,
    replacement,
  );

  return updateNodeRawContent(
    snapshot,
    'SPEC-BOLUS',
    nextRaw,
    editorName,
    nowIso,
  ).snapshot;
}

/**
 * Attempts QA certification as `actorName`. If `actorName` modified a drifted spec,
 * Segregation of Duties deterministically blocks self-certification and records the event.
 */
export function certifyDriftedNodes(
  snapshot: EvidenceGraphSnapshot,
  actorName: string,
  nowIso = new Date().toISOString(),
): {
  snapshot: EvidenceGraphSnapshot;
  allowed: boolean;
  reason: string;
} {
  const driftedByActor = snapshot.nodes.some(
    (n) =>
      n.approvedHash !== null &&
      n.liveHash !== n.approvedHash &&
      n.lastModifiedBy === actorName,
  );

  const currentEval = evaluateReleasePolicy(
    snapshot.nodes,
    snapshot.edges,
    snapshot.releaseNodeId,
    actorName,
    snapshot.policy,
    nowIso,
  );

  if (driftedByActor) {
    const reason = `SOD_VIOLATION: "${actorName}" modified the upstream specification and cannot self-certify QA sign-off. An independent QA reviewer must co-sign.`;
    const { nextLedger } = appendLedgerEntry(
      snapshot.ledger,
      {
        eventType: 'SOD_VIOLATION_BLOCKED',
        actorId: actorName,
        releaseId: snapshot.releaseNodeId,
        verdict: currentEval.verdict,
        evidenceFingerprint: currentEval.evidenceFingerprint,
        summary: reason,
      },
      nowIso,
    );

    return {
      snapshot: {
        ...snapshot,
        ledger: nextLedger,
        lastSyncedAt: nowIso,
      },
      allowed: false,
      reason,
    };
  }

  const nextNodes: EvidenceNode[] = snapshot.nodes.map((node) => {
    if (node.nodeType === 'RELEASE_GATE') {
      return { ...node, status: 'OPEN' as const };
    }
    return {
      ...node,
      status:
        node.nodeType === 'VERIFICATION_TEST'
          ? ('PASSED' as const)
          : ('CERTIFIED' as const),
      approvedContentNormalized: node.contentNormalized,
      approvedHash: node.liveHash,
      approvedBy: actorName,
      approvedAt: nowIso,
    };
  });

  const postEval = evaluateReleasePolicy(
    nextNodes,
    snapshot.edges,
    snapshot.releaseNodeId,
    actorName,
    snapshot.policy,
    nowIso,
  );

  const { nextLedger } = appendLedgerEntry(
    snapshot.ledger,
    {
      eventType: 'QA_CERTIFICATION_GRANTED',
      actorId: actorName,
      releaseId: snapshot.releaseNodeId,
      verdict: postEval.verdict,
      evidenceFingerprint: postEval.evidenceFingerprint,
      summary: `Independent QA co-signature granted by ${actorName}. All drifted clauses and suspect verification tests re-baselined (Confidence ${postEval.confidenceScore}%).`,
    },
    nowIso,
  );

  return {
    snapshot: {
      ...snapshot,
      nodes: nextNodes,
      ledger: nextLedger,
      lastSyncedAt: nowIso,
    },
    allowed: true,
    reason: 'Independent QA co-signature recorded and evidence graph re-certified.',
  };
}
