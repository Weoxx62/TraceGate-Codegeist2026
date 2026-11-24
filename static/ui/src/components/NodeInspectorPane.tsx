import React, { useState } from 'react';
import {
  computeInlineTokenDiff,
  type ClauseDiff,
  type EvidenceNode,
} from '../../../../src/core/index';
import { CheckIcon, CopyIcon } from './Icons';

interface NodeInspectorPaneProps {
  node: EvidenceNode;
  clauseDiffs: ClauseDiff[];
  draftContent: string;
  busy: boolean;
  nodeIndex?: number;
  totalNodes?: number;
  onStepNode?: (delta: -1 | 1) => void;
  onDraftChange: (value: string) => void;
  onTestCosmeticEdit: () => void;
  onSaveEdit: () => void;
}

export const NodeInspectorPane: React.FC<NodeInspectorPaneProps> = ({
  node,
  clauseDiffs,
  draftContent,
  busy,
  nodeIndex,
  totalNodes,
  onStepNode,
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

  const safeAtlassianUrl =
    node.url && /^https:\/\/[a-zA-Z0-9.-]+\.atlassian\.net\//i.test(node.url)
      ? node.url
      : null;

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {onStepNode && typeof nodeIndex === 'number' && typeof totalNodes === 'number' && (
              <div className="tg-stepper" aria-label="Step between evidence nodes">
                <button
                  type="button"
                  className="tg-step-btn"
                  onClick={() => onStepNode(-1)}
                  aria-label="Previous node"
                  title="Previous node ([)"
                >
                  ‹
                </button>
                <span className="tg-mono" style={{ fontSize: 10.5, color: 'var(--ink-muted)', padding: '0 4px' }}>
                  {nodeIndex + 1}/{totalNodes}
                </span>
                <button
                  type="button"
                  className="tg-step-btn"
                  onClick={() => onStepNode(1)}
                  aria-label="Next node"
                  title="Next node (])"
                >
                  ›
                </button>
              </div>
            )}
            <span className={`tg-pill ${statusPillClass}`}>{node.status}</span>
          </div>
        </div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-primary)' }}>
          {node.title}
        </div>
        {safeAtlassianUrl && (
          <div style={{ marginTop: 8 }}>
            <a
              href={safeAtlassianUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="tg-btn tg-btn-sm"
              style={{ textDecoration: 'none' }}
            >
              Open in {node.sourceProduct === 'CONFLUENCE' ? 'Confluence' : 'Jira'} ↗
            </a>
          </div>
        )}
      </div>

      {nodeDiffs.length > 0 && (
        <div className="tg-insp-section">
          <div className="tg-diff-box">
            <div className="tg-diff-head">
              Drift detected · {nodeDiffs[0].clauseKey}
            </div>
            {nodeDiffs.map((diff) => {
              const tok = computeInlineTokenDiff(diff.approvedLine, diff.liveLine);
              return (
                <div key={diff.clauseKey}>
                  <div className="tg-diff-line tg-diff-del">
                    - {tok.prefix}
                    {tok.removed && (
                      <mark className="tg-diff-token-del">{tok.removed}</mark>
                    )}
                    {tok.suffix}
                  </div>
                  <div className="tg-diff-line tg-diff-add">
                    + {tok.prefix}
                    {tok.added && (
                      <mark className="tg-diff-token-add">{tok.added}</mark>
                    )}
                    {tok.suffix}
                  </div>
                </div>
              );
            })}
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
            <span
              className="tg-kv-val tg-mono"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
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
