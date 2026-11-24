import React from 'react';
import { computeInlineTokenDiff } from '../../../../src/core/index';
import type { WorkspaceBundle } from '../bridge/forgeClient';
import { CheckIcon, LockIcon, RefreshIcon, ShieldCheckIcon } from './Icons';

interface ConfluenceBylineViewProps {
  bundle: WorkspaceBundle;
  busy: boolean;
  onSync: () => void;
  onCoSignQa: () => void;
}

export const ConfluenceBylineView: React.FC<ConfluenceBylineViewProps> = ({
  bundle,
  busy,
  onSync,
  onCoSignQa,
}) => {
  const { snapshot, evaluation } = bundle;
  const specNode =
    snapshot.nodes.find((n) => n.id === 'SPEC-BOLUS') ?? snapshot.nodes[0];
  const isDrifted = evaluation.driftedRootIds.includes(specNode.id);

  return (
    <div className="tg-byline-shell">
      <section className="tg-card" aria-label="TraceGate Confluence Byline Status">
        <div className="tg-card-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                color: isDrifted ? 'var(--coral)' : 'var(--emerald)',
                display: 'inline-flex',
              }}
            >
              {isDrifted ? <LockIcon size={15} /> : <ShieldCheckIcon size={15} />}
            </span>
            <div>
              <div className="tg-card-title">
                TraceGate · {specNode.externalId}
              </div>
              <div className="tg-card-sub">{specNode.title}</div>
            </div>
          </div>
          <span
            className={`tg-pill ${
              isDrifted ? 'tg-pill-coral' : 'tg-pill-emerald'
            }`}
          >
            {isDrifted ? 'SHA-256 Drift' : 'QA Certified'}
          </span>
        </div>

        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="tg-kv-list">
            <div className="tg-kv-row">
              <span className="tg-kv-key">Live Page Hash</span>
              <span className="tg-kv-val tg-mono">
                {specNode.liveHash.slice(0, 16)}…
              </span>
            </div>
            <div className="tg-kv-row">
              <span className="tg-kv-key">Linked Jira Impact</span>
              <span className="tg-kv-val tg-mono">
                {evaluation.blastRadius.length} items ({evaluation.fmeaExposureTotal} RPN)
              </span>
            </div>
          </div>

          {evaluation.clauseDiffs.length > 0 ? (
            <div className="tg-diff-box">
              <div className="tg-diff-head">
                Modified since QA baseline · {evaluation.clauseDiffs[0].clauseKey}
              </div>
              {evaluation.clauseDiffs.slice(0, 2).map((diff) => {
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
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                color: 'var(--emerald)',
              }}
            >
              <CheckIcon size={13} />
              <span>Normalized Confluence ADF matches downstream Jira verifications.</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, paddingTop: 2 }}>
            <button
              type="button"
              className="tg-btn tg-btn-sm"
              disabled={busy}
              onClick={onSync}
            >
              <RefreshIcon size={12} />
              Re-verify Page
            </button>
            {isDrifted && (
              <button
                type="button"
                className="tg-btn tg-btn-sm tg-btn-primary"
                disabled={busy}
                onClick={onCoSignQa}
              >
                Co-Sign as Lead QA
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
