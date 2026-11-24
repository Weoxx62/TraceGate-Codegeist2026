import React from 'react';
import { computeInlineTokenDiff } from '../../../../src/core/index';
import type { WorkspaceBundle } from '../bridge/forgeClient';
import { CheckIcon, CrossIcon, LockIcon, RefreshIcon, ShieldCheckIcon } from './Icons';

export const IssuePanelView: React.FC<{
  bundle: WorkspaceBundle;
  issueKey?: string;
  busy: boolean;
  onRefresh: () => void;
  onSelfSign: () => void;
  onIndependentQaSign: () => void;
  onCommit: () => void;
}> = ({
  bundle,
  issueKey,
  busy,
  onRefresh,
  onSelfSign,
  onIndependentQaSign,
  onCommit,
}) => {
  const { evaluation, snapshot } = bundle;
  const releaseNode = snapshot.nodes.find((n) => n.id === snapshot.releaseNodeId);
  const isReleased = releaseNode?.status === 'RELEASED';
  const isAllow = evaluation.verdict === 'ALLOW';
  const pillClass = isAllow
    ? 'tg-pill-emerald'
    : evaluation.verdict === 'NEEDS_REVIEW'
      ? 'tg-pill-amber'
      : 'tg-pill-coral';

  return (
    <div className="tg-issue-shell">
      <section className="tg-card" aria-label="TraceGate Issue Evidence Gate">
        <div className="tg-card-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span
              style={{
                color: isAllow ? 'var(--emerald)' : 'var(--coral)',
                display: 'inline-flex',
              }}
            >
              {isAllow ? <ShieldCheckIcon size={16} /> : <LockIcon size={15} />}
            </span>
            <div>
              <div className="tg-card-title">
                TraceGate Gate {issueKey ? `· ${issueKey}` : ''}
              </div>
              <div className="tg-card-sub">{snapshot.scenarioTitle}</div>
            </div>
          </div>

          <span className={`tg-pill ${pillClass}`}>
            {isReleased ? 'Released' : `${evaluation.verdict} · ${evaluation.confidenceScore}%`}
          </span>
        </div>

        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--ink-secondary)' }}>
            {evaluation.driftedRootIds.length} drifted spec · {evaluation.blastRadius.length} impacted artifacts · {evaluation.fmeaExposureTotal} RPN exposure
          </div>

          {evaluation.clauseDiffs.length > 0 && (
            <div className="tg-diff-box">
              <div className="tg-diff-head">
                Upstream drift · {evaluation.clauseDiffs[0].clauseKey}
              </div>
              {evaluation.clauseDiffs.map((diff) => {
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
          )}

          {evaluation.blockers.length === 0 ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                fontSize: 12.5,
                color: 'var(--emerald)',
              }}
            >
              <CheckIcon size={14} />
              <span>All 5 deterministic compliance controls verified.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {evaluation.blockers.slice(0, 3).map((b, i) => (
                <div
                  key={`${b.code}-${i}`}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    background: 'var(--bg-canvas)',
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: 'var(--coral)', marginTop: 2 }}>
                    <CrossIcon size={12} />
                  </span>
                  <div>
                    <span className="tg-mono" style={{ fontWeight: 600 }}>
                      {b.externalId}
                    </span>{' '}
                    <span style={{ color: 'var(--ink-secondary)' }}>{b.message}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 2 }}>
            <button
              type="button"
              className="tg-btn tg-btn-sm"
              disabled={busy}
              onClick={onRefresh}
            >
              <RefreshIcon size={12} />
              Sync
            </button>
            {!isAllow && (
              <>
                <button
                  type="button"
                  className="tg-btn tg-btn-sm tg-btn-coral"
                  disabled={busy}
                  onClick={onSelfSign}
                >
                  Test Self-Approval
                </button>
                <button
                  type="button"
                  className="tg-btn tg-btn-sm tg-btn-primary"
                  disabled={busy}
                  onClick={onIndependentQaSign}
                >
                  Co-Sign as Lead QA
                </button>
              </>
            )}
            <button
              type="button"
              className={`tg-btn tg-btn-sm ${isAllow && !isReleased ? 'tg-btn-emerald' : ''}`}
              disabled={busy || isReleased}
              onClick={onCommit}
            >
              {isReleased ? 'Committed' : 'Commit Release'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
