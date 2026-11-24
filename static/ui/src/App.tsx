import React, { useEffect, useState } from 'react';
import {
  attemptQaSignOffAction,
  createRemediationAction,
  detectForgeContext,
  editNodeContentAction,
  executeCommitAction,
  exportAuditPackAction,
  fetchWorkspaceState,
  resetDemoScenario,
  runMcpSimulatorAction,
  seedDemoScenario,
  simulateCommitRaceAction,
  triggerSpecDriftAction,
  type ForgeViewContext,
  type WorkspaceBundle,
} from './bridge/forgeClient';
import {
  generateAuditPackMarkdown,
  INDUSTRY_PRESETS,
  verifyLedgerChain,
  type IndustryPreset,
  type LedgerEntry,
} from '../../../src/core/index';
import { AuditLedgerTab } from './components/AuditLedgerTab';
import { EvidenceGraphCanvas } from './components/EvidenceGraphCanvas';
import { FaultLabDrawer } from './components/FaultLabDrawer';
import { GitBranchIcon, LockIcon, ShieldCheckIcon, SlidersIcon } from './components/Icons';
import { IssuePanelView } from './components/IssuePanelView';
import { LeftSidebar, type StudioView } from './components/LeftSidebar';
import { McpAccessTab, SKILL_MD_TEMPLATE, type McpSimulatorTool } from './components/McpAccessTab';
import { NodeInspectorPane } from './components/NodeInspectorPane';
import { PolicyChecksPane } from './components/PolicyChecksPane';

export const App: React.FC = () => {
  const [viewContext, setViewContext] = useState<ForgeViewContext>({
    moduleKey: 'tracegate-command-center',
    isForgeRuntime: false,
  });
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [previewIssuePanel, setPreviewIssuePanel] = useState(false);
  const [faultLabOpen, setFaultLabOpen] = useState(false);
  const [bundle, setBundle] = useState<WorkspaceBundle | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('SPEC-BOLUS');
  const [activeView, setActiveView] = useState<StudioView>('graph');
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{
    kind: 'info' | 'success' | 'error';
    text: string;
  } | null>(null);
  const [mcpOutput, setMcpOutput] = useState<string>('');
  const [tamperTestResult, setTamperTestResult] = useState<string | null>(null);
  const [selectedProjectKey, setSelectedProjectKey] = useState<string>('');
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>('');
  const [selectedPreset, setSelectedPreset] = useState<IndustryPreset>('MEDTECH_IEC62304');
  const [draftNodeContent, setDraftNodeContent] = useState<string>('');

  async function loadInitial(): Promise<void> {
    setBusy(true);
    try {
      const ctx = await detectForgeContext();
      setViewContext(ctx);

      let state: WorkspaceBundle | null = null;
      if (!ctx.isForgeRuntime && typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const viewParam = params.get('view');
        const tabParam = params.get('tab');
        const presetParam = params.get('preset');
        const demoStateParam = params.get('demoState');
        const drawerParam = params.get('drawer');
        const themeParam = params.get('theme');

        if (themeParam === 'light' || themeParam === 'dark') {
          setTheme(themeParam);
        }
        if (viewParam === 'issue-panel') {
          setPreviewIssuePanel(true);
        }
        if (drawerParam === 'fault-lab') {
          setFaultLabOpen(true);
        }
        if (tabParam === 'graph' || tabParam === 'mcp' || tabParam === 'ledger') {
          setActiveView(tabParam);
        }

        const validPreset: IndustryPreset | undefined =
          presetParam && presetParam in INDUSTRY_PRESETS
            ? (presetParam as IndustryPreset)
            : undefined;

        if (demoStateParam === 'certified') {
          state = await resetDemoScenario(validPreset);
        } else if (validPreset) {
          state = await seedDemoScenario({ industryPreset: validPreset });
        }

        if (tabParam === 'mcp') {
          if (!state) {
            state = await fetchWorkspaceState();
          }
          const mcpResult = await runMcpSimulatorAction({
            tool: 'evaluate-release-gate',
          });
          setMcpOutput(JSON.stringify(mcpResult, null, 2));
          state = await fetchWorkspaceState();
        }
      }

      if (!state) {
        state = await fetchWorkspaceState();
      }

      setBundle(state);
      if (state.snapshot.industryPreset) {
        setSelectedPreset(state.snapshot.industryPreset);
      }
      if (state.environment?.projects[0] && !selectedProjectKey) {
        setSelectedProjectKey(state.environment.projects[0].key);
      }
      if (state.environment?.spaces[0] && !selectedSpaceId) {
        setSelectedSpaceId(state.environment.spaces[0].id);
      }
    } catch (err) {
      setBanner({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Failed to load workspace.',
      });
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void loadInitial();
  }, []);

  const selectedNodeForDraft = bundle
    ? (bundle.snapshot.nodes.find((n) => n.id === selectedNodeId) ??
      bundle.snapshot.nodes[0])
    : null;

  useEffect(() => {
    if (selectedNodeForDraft) {
      setDraftNodeContent(selectedNodeForDraft.rawContent);
    }
  }, [selectedNodeForDraft?.id, selectedNodeForDraft?.rawContent]);

  if (!bundle) {
    return (
      <div className="tg-studio" data-theme={theme}>
        <div className="tg-center-pane">
          <div className="tg-card" style={{ padding: 16 }}>
            Initializing TraceGate compliance studio…
          </div>
        </div>
      </div>
    );
  }

  const { snapshot, evaluation } = bundle;
  const selectedNode =
    snapshot.nodes.find((n) => n.id === selectedNodeId) ?? snapshot.nodes[0];
  const activePreset =
    INDUSTRY_PRESETS[snapshot.industryPreset ?? selectedPreset] ??
    INDUSTRY_PRESETS.MEDTECH_IEC62304;
  const releaseNode = snapshot.nodes.find((n) => n.id === snapshot.releaseNodeId);
  const releaseKey = releaseNode?.externalId ?? snapshot.releaseNodeId;
  const isReleased = releaseNode?.status === 'RELEASED';
  const isAllow = evaluation.verdict === 'ALLOW';

  const statusSummaryText = isReleased
    ? `Release ${releaseKey} committed cleanly and sealed in the SHA-256 ledger.`
    : isAllow
      ? 'All 5 controls verified with zero upstream specification drift.'
      : evaluation.clauseDiffs[0]
        ? `${evaluation.clauseDiffs[0].externalId} modified after QA sign-off (${activePreset.approvedDriftValue} → ${activePreset.driftedValue}), invalidating ${evaluation.blastRadius.length} downstream artifacts.`
        : `${evaluation.blockers.length} compliance check${evaluation.blockers.length === 1 ? '' : 's'} blocking release transition.`;

  const handleRefresh = async () => {
    setBusy(true);
    try {
      const next = await fetchWorkspaceState();
      setBundle(next);
      setBanner({
        kind: 'info',
        text: `Sources synchronized: ${next.evaluation.verdict} (${next.evaluation.confidenceScore}%).`,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSelfSign = async () => {
    setBusy(true);
    try {
      const res = await attemptQaSignOffAction('SELF_SIGN');
      setBundle(res);
      setBanner({
        kind: res.signOffAllowed ? 'success' : 'error',
        text: res.signOffMessage,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleIndependentQaSign = async () => {
    setBusy(true);
    try {
      const res = await attemptQaSignOffAction('INDEPENDENT_QA');
      setBundle(res);
      setBanner({ kind: 'success', text: res.signOffMessage });
    } finally {
      setBusy(false);
    }
  };

  const handleCommit = async () => {
    setBusy(true);
    try {
      const res = await executeCommitAction(evaluation.evidenceFingerprint);
      setBundle(res);
      setBanner({
        kind: res.commitResult.committed ? 'success' : 'error',
        text: res.commitResult.message,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSeedDemo = async (presetOverride?: IndustryPreset) => {
    setBusy(true);
    try {
      const presetToSeed = presetOverride ?? selectedPreset;
      const space = bundle.environment?.spaces.find((s) => s.id === selectedSpaceId);
      const next = await seedDemoScenario({
        projectKey: selectedProjectKey || snapshot.projectKey,
        spaceId: selectedSpaceId || null,
        spaceKey: space?.key ?? null,
        industryPreset: presetToSeed,
      });
      setBundle(next);
      setSelectedPreset(presetToSeed);
      setSelectedNodeId('SPEC-BOLUS');
      const presetMeta = INDUSTRY_PRESETS[presetToSeed];
      setBanner({
        kind: 'info',
        text: `Loaded ${presetMeta.label} (${presetMeta.approvedDriftValue} -> ${presetMeta.driftedValue} drift).`,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSimulateDrift = async () => {
    setBusy(true);
    try {
      const next = await triggerSpecDriftAction(activePreset.nextTamperValue);
      setBundle(next);
      setSelectedNodeId('SPEC-BOLUS');
      setBanner({
        kind: 'error',
        text: `Injected drift on ${activePreset.primaryClauseKey} (-> ${activePreset.nextTamperValue}); downstream gate locked.`,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleResetDemo = async () => {
    setBusy(true);
    try {
      const next = await resetDemoScenario(selectedPreset);
      setBundle(next);
      setBanner({
        kind: 'success',
        text: `Restored ${activePreset.label} clean baseline (100% ALLOW).`,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSaveLiveNodeEdit = async (contentOverride?: string) => {
    setBusy(true);
    try {
      const res = await editNodeContentAction({
        nodeId: selectedNode.id,
        rawContent: contentOverride ?? draftNodeContent,
      });
      setBundle(res);
      setBanner({
        kind: res.hashChanged ? 'error' : 'success',
        text: res.editMessage,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleTestCosmeticEdit = async () => {
    const cosmetic = draftNodeContent
      .split('\n')
      .map((line) => `**${line.trim()}**,   `)
      .join('\n\n');
    setDraftNodeContent(cosmetic);
    await handleSaveLiveNodeEdit(cosmetic);
  };

  const handleSimulateCommitRace = async () => {
    setBusy(true);
    try {
      const res = await simulateCommitRaceAction();
      setBundle(res);
      setBanner({
        kind: res.commitResult.committed ? 'success' : 'error',
        text: res.commitResult.message,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleCreateRemediation = async () => {
    setBusy(true);
    try {
      const res = await createRemediationAction();
      setBundle(res);
      setBanner({
        kind: 'info',
        text:
          res.createdKeys.length > 0
            ? `Created Jira tasks: ${res.createdKeys.join(', ')}`
            : 'Logged remediation plan in the audit ledger.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleRunMcpTool = async (tool: McpSimulatorTool) => {
    setBusy(true);
    try {
      const output = await runMcpSimulatorAction({
        tool,
        expectedFingerprint: evaluation.evidenceFingerprint,
      });
      setMcpOutput(JSON.stringify(output, null, 2));
      const refreshed = await fetchWorkspaceState();
      setBundle(refreshed);
    } finally {
      setBusy(false);
    }
  };

  const handleSimulateLedgerTamper = () => {
    if (snapshot.ledger.length === 0) return;
    const tampered: LedgerEntry[] = snapshot.ledger.map((entry, idx) =>
      idx === 0
        ? {
            ...entry,
            payload: { ...entry.payload, summary: `${entry.payload.summary} [TAMPERED]` },
          }
        : entry,
    );
    const check = verifyLedgerChain(tampered);
    setTamperTestResult(
      `Self-test injected 1-token edit at Entry #0 -> valid=${check.valid}, brokenAtIndex=${check.brokenAtIndex}. Live chain intact.`,
    );
  };

  const handleDownloadAuditPack = () => {
    const md = generateAuditPackMarkdown(
      snapshot,
      evaluation,
      bundle.ledgerVerification,
    );
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TraceGate-Audit-Pack-${snapshot.projectKey}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportAuditPack = async () => {
    setBusy(true);
    try {
      const res = await exportAuditPackAction(selectedSpaceId || undefined);
      setBundle(res);
      setBanner({
        kind: 'success',
        text: res.exportedPageId
          ? `Published Audit Pack to Confluence (Page ${res.exportedPageId}).`
          : 'Audit Pack recorded in ledger.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleDownloadSkillMd = () => {
    const blob = new Blob([SKILL_MD_TEMPLATE], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SKILL.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const isCompactIssuePanel =
    viewContext.moduleKey === 'tracegate-issue-gate' || previewIssuePanel;

  if (isCompactIssuePanel) {
    return (
      <div data-theme={theme} style={{ minHeight: '100vh', background: 'var(--bg-canvas)' }}>
        {!viewContext.isForgeRuntime && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 18px 0' }}>
            <button
              type="button"
              className="tg-btn tg-btn-sm"
              onClick={() => setPreviewIssuePanel(false)}
            >
              Return to Full Studio
            </button>
          </div>
        )}
        <IssuePanelView
          bundle={bundle}
          issueKey={viewContext.issueKey ?? releaseKey}
          busy={busy}
          onRefresh={() => void handleRefresh()}
          onSelfSign={() => void handleSelfSign()}
          onIndependentQaSign={() => void handleIndependentQaSign()}
          onCommit={() => void handleCommit()}
        />
      </div>
    );
  }

  return (
    <div className="tg-studio" data-theme={theme}>
      <LeftSidebar
        activePresetId={snapshot.industryPreset ?? selectedPreset}
        activeView={activeView}
        ledgerCount={snapshot.ledger.length}
        isForgeRuntime={viewContext.isForgeRuntime}
        theme={theme}
        busy={busy}
        onSelectPreset={(preset) => void handleSeedDemo(preset)}
        onSelectView={setActiveView}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      />

      <div className="tg-workspace-shell">
        <header className="tg-header">
          <div className="tg-header-left">
            <span className="tg-key-tag">{releaseKey}</span>
            <h1 className="tg-header-title">{snapshot.scenarioTitle}</h1>
            <span className="tg-header-std">{activePreset.standard}</span>
          </div>

          <div className="tg-header-actions">
            <button
              type="button"
              className="tg-btn"
              onClick={() => setFaultLabOpen(true)}
            >
              <span
                className={`tg-dot ${
                  isAllow ? 'tg-dot-emerald' : 'tg-dot-coral'
                }`}
                aria-hidden="true"
              />
              <SlidersIcon size={13} />
              <span>Fault Lab</span>
            </button>

            {isReleased ? (
              <span className="tg-pill tg-pill-emerald" style={{ height: 30, padding: '0 12px' }}>
                <ShieldCheckIcon size={13} />
                Released
              </span>
            ) : !isAllow ? (
              <button
                type="button"
                className="tg-btn tg-btn-primary"
                disabled={busy}
                onClick={() => void handleIndependentQaSign()}
              >
                Co-Sign as Lead QA
              </button>
            ) : (
              <button
                type="button"
                className="tg-btn tg-btn-emerald"
                disabled={busy}
                onClick={() => void handleCommit()}
              >
                Commit Release
              </button>
            )}
          </div>
        </header>

        <div className="tg-body-split">
          <main className="tg-center-pane">
            {banner && (
              <div className={`tg-toast tg-toast-${banner.kind}`} role="status">
                <span>{banner.text}</span>
                <button
                  type="button"
                  className="tg-btn tg-btn-sm tg-btn-ghost"
                  onClick={() => setBanner(null)}
                >
                  Dismiss
                </button>
              </div>
            )}

            {activeView === 'graph' && (
              <>
                <div className="tg-status-line" aria-label="Gate Decision Summary">
                  <div className="tg-status-line-left">
                    <span
                      className={`tg-pill ${
                        isAllow
                          ? 'tg-pill-emerald'
                          : evaluation.verdict === 'NEEDS_REVIEW'
                            ? 'tg-pill-amber'
                            : 'tg-pill-coral'
                      }`}
                    >
                      {isAllow ? <ShieldCheckIcon size={11} /> : <LockIcon size={11} />}
                      {isReleased
                        ? 'Released'
                        : `${evaluation.verdict} · ${evaluation.confidenceScore}%`}
                    </span>
                    <span className="tg-status-msg">{statusSummaryText}</span>
                  </div>

                  <span className="tg-status-meta">
                    {evaluation.blastRadius.length} impacted · {evaluation.fmeaExposureTotal} RPN
                  </span>
                </div>

                <section className="tg-card" aria-label="Evidence Traceability Lineage">
                  <div className="tg-card-head">
                    <div className="tg-card-title">
                      <GitBranchIcon size={14} />
                      <span>Evidence Lineage</span>
                    </div>
                    <span className="tg-card-sub">
                      Select any node to inspect digest &amp; clauses
                    </span>
                  </div>

                  <div style={{ padding: '12px 14px 10px' }}>
                    <EvidenceGraphCanvas
                      nodes={snapshot.nodes}
                      edges={snapshot.edges}
                      evaluation={evaluation}
                      selectedNodeId={selectedNode.id}
                      onSelectNode={setSelectedNodeId}
                    />
                  </div>
                </section>

                <PolicyChecksPane
                  evaluation={evaluation}
                  selectedNodeId={selectedNode.id}
                  busy={busy}
                  onSelectNode={setSelectedNodeId}
                  onCreateRemediation={() => void handleCreateRemediation()}
                />
              </>
            )}

            {activeView === 'mcp' && (
              <McpAccessTab
                mcpOutput={mcpOutput}
                busy={busy}
                onRunTool={(tool) => void handleRunMcpTool(tool)}
                onDownloadSkill={handleDownloadSkillMd}
              />
            )}

            {activeView === 'ledger' && (
              <AuditLedgerTab
                ledger={snapshot.ledger}
                verification={bundle.ledgerVerification}
                tamperTestResult={tamperTestResult}
                busy={busy}
                onRunTamperTest={handleSimulateLedgerTamper}
                onDismissTamperTest={() => setTamperTestResult(null)}
                onDownloadAuditPack={handleDownloadAuditPack}
                onExportToConfluence={() => void handleExportAuditPack()}
              />
            )}
          </main>

          {activeView === 'graph' && (
            <NodeInspectorPane
              node={selectedNode}
              clauseDiffs={evaluation.clauseDiffs}
              draftContent={draftNodeContent}
              busy={busy}
              onDraftChange={setDraftNodeContent}
              onTestCosmeticEdit={() => void handleTestCosmeticEdit()}
              onSaveEdit={() => void handleSaveLiveNodeEdit()}
            />
          )}
        </div>
      </div>

      <FaultLabDrawer
        open={faultLabOpen}
        bundle={bundle}
        isForgeRuntime={viewContext.isForgeRuntime}
        previewIssuePanel={previewIssuePanel}
        nextTamperValue={activePreset.nextTamperValue}
        selectedProjectKey={selectedProjectKey}
        selectedSpaceId={selectedSpaceId}
        busy={busy}
        banner={banner}
        onClose={() => setFaultLabOpen(false)}
        onDismissBanner={() => setBanner(null)}
        onSimulateDrift={() => void handleSimulateDrift()}
        onSelfSign={() => void handleSelfSign()}
        onSimulateCommitRace={() => void handleSimulateCommitRace()}
        onResetBaseline={() => void handleResetDemo()}
        onProjectChange={setSelectedProjectKey}
        onSpaceChange={setSelectedSpaceId}
        onSeedWorkspace={() => void handleSeedDemo()}
        onSyncLive={() => void handleRefresh()}
        onToggleIssuePanel={() => {
          setFaultLabOpen(false);
          setPreviewIssuePanel((v) => !v);
        }}
      />
    </div>
  );
};
