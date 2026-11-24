import React, { useState } from 'react';
import type { ClauseDiff, EvidenceNode } from '../../../../src/core/index';
import { CheckIcon, CopyIcon } from './Icons';

interface NodeInspectorPaneProps {
  node: EvidenceNode;
  clauseDiffs: ClauseDiff[];
  draftContent: string;
  busy: boolean;
  onDraftChange: (value: string) => void;
  onTestCosmeticEdit: () => void;
  onSaveEdit: () => void;
}

export const NodeInspectorPane: React.FC<NodeInspectorPaneProps> = ({
  node,
  clauseDiffs,
  draftContent,
  busy,
  onDraftChange,
  onTestCosmeticEdit,
  onSaveEdit,
}) => {
  const [contentView, setContentView] = useState<'edit' | 'normalized'>('edit');
  const [copiedHash, setCopiedHash] = useState(false);

  const nodeDiffs = clauseDiffs.filter((d) => d.nodeId === node.id);
  const statusPillClass =
    node.status === 'DRIFTED' || node.status === 'BLOCKED'
      ? 'tg-pill-coral'
      : node.status === 'SUSPECT'
        ? 'tg-pill-amber'
        : 'tg-pill-emerald';

  const handleCopyHash = async () => {
    try {
      await navigator.clipboard.writeText(node.liveHash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 1600);
    } catch {
      setCopiedHash(false);
    }
  };

  return (
    <aside className="tg-inspector-pane" aria-label="Artifact Inspector">
      <div className="tg-insp-section">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            marginBottom: 6,
          }}
        >
          <span className="tg-mono" style={{ fontSize: 12, color: 'var(--ink-secondary)' }}>
            {node.externalId} · {node.sourceProduct}
          </span>
          <span className={`tg-pill ${statusPillClass}`}>{node.status}</span>
        </div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-primary)' }}>
          {node.title}
        </div>
      </div>

      {nodeDiffs.length > 0 && (
        <div className="tg-insp-section">
          <div className="tg-diff-box">
            <div className="tg-diff-head">
              Drift detected · {nodeDiffs[0].clauseKey}
            </div>
            {nodeDiffs.map((diff) => (
              <div key={diff.clauseKey}>
                <div className="tg-diff-line tg-diff-del">
                  - {diff.approvedLine ?? '(none)'}
                </div>
                <div className="tg-diff-line tg-diff-add">
                  + {diff.liveLine ?? '(removed)'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="tg-insp-section">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            marginBottom: 10,
          }}
        >
          <div className="tg-seg" role="tablist" aria-label="Artifact Content View">
            <button
              type="button"
              role="tab"
              aria-selected={contentView === 'edit'}
              className={`tg-seg-btn ${contentView === 'edit' ? 'tg-seg-active' : ''}`}
              onClick={() => setContentView('edit')}
            >
              Source
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={contentView === 'normalized'}
              className={`tg-seg-btn ${contentView === 'normalized' ? 'tg-seg-active' : ''}`}
              onClick={() => setContentView('normalized')}
            >
              Normalized
            </button>
          </div>
          <span className="tg-mono" style={{ fontSize: 11, color: 'var(--ink-muted)' }}>
            v{node.version}
          </span>
        </div>

        {contentView === 'edit' ? (
          <>
            <textarea
              aria-label="Live Artifact Content Editor"
              className="tg-textarea"
              value={draftContent}
              onChange={(e) => onDraftChange(e.target.value)}
            />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                marginTop: 10,
              }}
            >
              <button
                type="button"
                className="tg-btn tg-btn-sm"
                disabled={busy}
                onClick={onTestCosmeticEdit}
              >
                Format-Only Test
              </button>
              <button
                type="button"
                className="tg-btn tg-btn-sm tg-btn-primary"
                disabled={busy}
                onClick={onSaveEdit}
              >
                Save
              </button>
            </div>
          </>
        ) : (
          <pre className="tg-code">{node.contentNormalized}</pre>
        )}
      </div>

      <div className="tg-insp-section">
        <div className="tg-kv-list">
          <div className="tg-kv-row">
            <span className="tg-kv-key">Modified by</span>
            <span className="tg-kv-val">{node.lastModifiedBy}</span>
          </div>
          <div className="tg-kv-row">
            <span className="tg-kv-key">QA reviewer</span>
            <span className="tg-kv-val">{node.approvedBy ?? 'Pending'}</span>
          </div>
          <div className="tg-kv-row">
            <span className="tg-kv-key">Live SHA-256</span>
            <span className="tg-kv-val tg-mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span>{node.liveHash.slice(0, 12)}…</span>
              <button
                type="button"
                className="tg-btn tg-btn-sm tg-btn-ghost"
                style={{ padding: '0 4px', height: 22 }}
                onClick={() => void handleCopyHash()}
                aria-label="Copy node SHA-256 hash"
              >
                {copiedHash ? <CheckIcon size={11} /> : <CopyIcon size={11} />}
              </button>
            </span>
          </div>
          <div className="tg-kv-row">
            <span className="tg-kv-key">QA baseline</span>
            <span className="tg-kv-val tg-mono">
              {node.approvedHash ? `${node.approvedHash.slice(0, 12)}…` : 'None'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
