import React from 'react';
import type { WorkspaceBundle } from '../bridge/forgeClient';
import { CloseIcon, RefreshIcon, SlidersIcon } from './Icons';

interface FaultLabDrawerProps {
  open: boolean;
  bundle: WorkspaceBundle;
  isForgeRuntime: boolean;
  previewIssuePanel: boolean;
  nextTamperValue: string;
  selectedProjectKey: string;
  selectedSpaceId: string;
  busy: boolean;
  banner: { kind: 'info' | 'success' | 'error'; text: string } | null;
  onClose: () => void;
  onDismissBanner: () => void;
  onSimulateDrift: () => void;
  onSelfSign: () => void;
  onSimulateCommitRace: () => void;
  onResetBaseline: () => void;
  onProjectChange: (key: string) => void;
  onSpaceChange: (id: string) => void;
  onSeedWorkspace: () => void;
  onSyncLive: () => void;
  onToggleIssuePanel: () => void;
  onPreviewConfluenceByline: () => void;
}

export const FaultLabDrawer: React.FC<FaultLabDrawerProps> = ({
  open,
  bundle,
  isForgeRuntime,
  previewIssuePanel,
  nextTamperValue,
  selectedProjectKey,
  selectedSpaceId,
  busy,
  banner,
  onClose,
  onDismissBanner,
  onSimulateDrift,
  onSelfSign,
  onSimulateCommitRace,
  onResetBaseline,
  onProjectChange,
  onSpaceChange,
  onSeedWorkspace,
  onSyncLive,
  onToggleIssuePanel,
  onPreviewConfluenceByline,
}) => {
  if (!open) return null;

  const { evaluation, ledgerVerification, environment, storage, snapshot } = bundle;

  return (
    <div
      className="tg-drawer-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="TraceGate Fault Lab & Diagnostics"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="tg-drawer">
        <div className="tg-drawer-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SlidersIcon size={15} />
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>
              Fault Lab &amp; Workspace Diagnostics
            </span>
          </div>
          <button
            type="button"
            className="tg-btn tg-btn-icon tg-btn-ghost"
            onClick={onClose}
            aria-label="Close Fault Lab"
          >
            <CloseIcon size={14} />
          </button>
        </div>

        <div className="tg-drawer-body">
          <div className="tg-stat-grid">
            <div className="tg-stat-box">
              <div className="tg-stat-label">Gate Readiness</div>
              <div className="tg-stat-num">{evaluation.confidenceScore}%</div>
            </div>
            <div className="tg-stat-box">
              <div className="tg-stat-label">Blast Radius</div>
              <div className="tg-stat-num">
                {evaluation.blastRadius.length} / {snapshot.nodes.length}
              </div>
            </div>
            <div className="tg-stat-box">
              <div className="tg-stat-label">FMEA Exposure</div>
              <div className="tg-stat-num">{evaluation.fmeaExposureTotal} RPN</div>
            </div>
            <div className="tg-stat-box">
              <div className="tg-stat-label">Audit Chain</div>
              <div className="tg-stat-num">
                {ledgerVerification.valid ? 'Verified' : 'Broken'}
              </div>
            </div>
          </div>

          {banner && (
            <div className={`tg-toast tg-toast-${banner.kind}`}>
              <span>{banner.text}</span>
              <button
                type="button"
                className="tg-btn tg-btn-sm tg-btn-ghost"
                onClick={onDismissBanner}
              >
                Clear
              </button>
            </div>
          )}

          <div>
            <div className="tg-nav-label" style={{ paddingLeft: 0 }}>
              Adversarial &amp; Compliance Simulations
            </div>
            <div className="tg-sim-grid">
              <button
                type="button"
                className="tg-btn tg-btn-coral"
                disabled={busy}
                onClick={onSimulateDrift}
              >
                Inject Drift ({nextTamperValue})
              </button>
              <button
                type="button"
                className="tg-btn"
                disabled={busy}
                onClick={onSelfSign}
              >
                Test Self-Approval
              </button>
              <button
                type="button"
                className="tg-btn"
                disabled={busy}
                onClick={onSimulateCommitRace}
              >
                Simulate Commit Race
              </button>
              <button
                type="button"
                className="tg-btn"
                disabled={busy}
                onClick={onResetBaseline}
              >
                Reset Clean Baseline
              </button>
            </div>
          </div>

          <div
            style={{
              padding: 12,
              borderRadius: 7,
              border: '1px solid var(--border)',
              background: 'var(--bg-canvas)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div className="tg-nav-label" style={{ padding: 0 }}>
              Atlassian Cloud Seeding
            </div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className="tg-stat-label">Target Jira Project</span>
              <select
                className="tg-select"
                value={selectedProjectKey}
                onChange={(e) => onProjectChange(e.target.value)}
              >
                {(environment?.projects ?? [{ key: 'MED', name: 'Demo Project' }]).map(
                  (p) => (
                    <option key={p.key} value={p.key}>
                      {p.key} — {p.name}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className="tg-stat-label">Confluence Space (Optional)</span>
              <select
                className="tg-select"
                value={selectedSpaceId}
                onChange={(e) => onSpaceChange(e.target.value)}
              >
                <option value="">Jira-only mode</option>
                {(environment?.spaces ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.key} — {s.name}
                  </option>
                ))}
              </select>
            </label>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="tg-btn tg-btn-primary"
                style={{ flex: 1 }}
                disabled={busy}
                onClick={onSeedWorkspace}
              >
                Seed Workspace
              </button>
              <button
                type="button"
                className="tg-btn"
                disabled={busy}
                onClick={onSyncLive}
              >
                <RefreshIcon size={12} />
                Sync
              </button>
            </div>
          </div>

          <div className="tg-kv-list" style={{ paddingTop: 2 }}>
            <div className="tg-nav-label" style={{ padding: 0 }}>
              Forge Bindings
            </div>
            <div className="tg-kv-row">
              <span className="tg-kv-key">Jira REST v3</span>
              <span className={`tg-pill ${environment?.jiraConnected ? 'tg-pill-emerald' : 'tg-pill-coral'}`}>
                {environment?.jiraConnected ? 'Connected' : 'Offline'}
              </span>
            </div>
            <div className="tg-kv-row">
              <span className="tg-kv-key">Confluence REST v2</span>
              <span className={`tg-pill ${environment?.confluenceConnected ? 'tg-pill-emerald' : 'tg-pill-neutral'}`}>
                {environment?.confluenceConnected ? 'Connected' : 'Optional'}
              </span>
            </div>
            <div className="tg-kv-row">
              <span className="tg-kv-key">Storage</span>
              <span className="tg-kv-val tg-mono">
                {storage?.sqlAvailable ? 'Forge SQL + KVS' : 'Forge KVS'}
              </span>
            </div>
            <div className="tg-kv-row">
              <span className="tg-kv-key">Seeded artifacts</span>
              <span className="tg-kv-val tg-mono">
                {Object.keys(snapshot.seededJiraIssueKeys).length} issues
              </span>
            </div>
          </div>

          {!isForgeRuntime && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="tg-btn"
                style={{ flex: 1 }}
                onClick={onToggleIssuePanel}
              >
                {previewIssuePanel ? 'Full Studio' : 'Jira Issue Panel'}
              </button>
              <button
                type="button"
                className="tg-btn"
                style={{ flex: 1 }}
                onClick={onPreviewConfluenceByline}
              >
                Confluence Byline
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
