import React, { useEffect } from 'react';
import { INDUSTRY_PRESETS } from '../../../../src/core/index';
import type { WorkspaceBundle } from '../bridge/forgeClient';
import { CloseIcon, DownloadIcon, ShieldCheckIcon } from './Icons';

interface CertificateModalProps {
  open: boolean;
  bundle: WorkspaceBundle;
  onClose: () => void;
  onDownloadHtml: () => void;
  onDownloadMd: () => void;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  open,
  bundle,
  onClose,
  onDownloadHtml,
  onDownloadMd,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const { snapshot, evaluation, ledgerVerification } = bundle;
  const preset =
    INDUSTRY_PRESETS[snapshot.industryPreset ?? 'MEDTECH_IEC62304'] ??
    INDUSTRY_PRESETS.MEDTECH_IEC62304;
  const isAllow = evaluation.verdict === 'ALLOW';

  return (
    <div
      className="tg-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Regulatory Compliance Certificate"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="tg-cert-modal">
        <div className="tg-cert-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                color: isAllow ? 'var(--emerald)' : 'var(--coral)',
                display: 'inline-flex',
              }}
            >
              <ShieldCheckIcon size={17} />
            </span>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-primary)' }}>
                Regulatory Compliance Certificate · {preset.standard}
              </div>
              <div className="tg-card-sub">
                {snapshot.scenarioTitle} · Policy {snapshot.policy.version}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              className="tg-btn tg-btn-sm"
              onClick={onDownloadMd}
            >
              <DownloadIcon size={12} />
              Export (.md)
            </button>
            <button
              type="button"
              className="tg-btn tg-btn-sm tg-btn-primary"
              onClick={onDownloadHtml}
            >
              <DownloadIcon size={12} />
              Save HTML / PDF
            </button>
            <button
              type="button"
              className="tg-btn tg-btn-icon tg-btn-ghost"
              onClick={onClose}
              aria-label="Close Certificate"
            >
              <CloseIcon size={14} />
            </button>
          </div>
        </div>

        <div className="tg-cert-body">
          <div className="tg-cert-summary-grid">
            <div className="tg-stat-box">
              <div className="tg-stat-label">Gate Verdict</div>
              <div style={{ marginTop: 4 }}>
                <span className={`tg-pill ${isAllow ? 'tg-pill-emerald' : 'tg-pill-coral'}`}>
                  {evaluation.verdict} · {evaluation.confidenceScore}%
                </span>
              </div>
            </div>
            <div className="tg-stat-box">
              <div className="tg-stat-label">Audit Ledger Integrity</div>
              <div className="tg-stat-num" style={{ fontSize: 13 }}>
                {ledgerVerification.valid ? 'VERIFIED INTACT' : 'BROKEN'} ({ledgerVerification.totalEntries} entries)
              </div>
            </div>
            <div className="tg-stat-box" style={{ gridColumn: 'span 2' }}>
              <div className="tg-stat-label">Canonical Evidence Fingerprint (SHA-256)</div>
              <div className="tg-mono" style={{ marginTop: 3, fontSize: 11.5, wordBreak: 'break-all', color: 'var(--ink-primary)' }}>
                {evaluation.evidenceFingerprint}
              </div>
            </div>
          </div>

          {evaluation.clauseDiffs.length > 0 && (
            <div className="tg-diff-box">
              <div className="tg-diff-head">
                Detected Upstream Drift ({evaluation.clauseDiffs.length} clause change)
              </div>
              {evaluation.clauseDiffs.map((d) => (
                <div key={`${d.nodeId}-${d.clauseKey}`}>
                  <div className="tg-diff-line tg-diff-del">- Approved: {d.approvedLine ?? 'N/A'}</div>
                  <div className="tg-diff-line tg-diff-add">+ Live: {d.liveLine ?? 'N/A'}</div>
                </div>
              ))}
            </div>
          )}

          <div>
            <div className="tg-nav-label" style={{ paddingLeft: 0 }}>
              Requirements Traceability Matrix ({snapshot.nodes.length} artifacts)
            </div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
              <table className="tg-table">
                <thead>
                  <tr>
                    <th>External ID</th>
                    <th>Pillar</th>
                    <th>Status</th>
                    <th>Ver</th>
                    <th>SHA-256</th>
                    <th>QA Reviewer</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.nodes.map((node) => (
                    <tr key={node.id}>
                      <td className="tg-mono">{node.externalId}</td>
                      <td>{node.pillar}</td>
                      <td>
                        <span
                          className={`tg-pill ${
                            node.status === 'DRIFTED' || node.status === 'BLOCKED'
                              ? 'tg-pill-coral'
                              : node.status === 'SUSPECT'
                                ? 'tg-pill-amber'
                                : 'tg-pill-emerald'
                          }`}
                        >
                          {node.status}
                        </span>
                      </td>
                      <td className="tg-mono">v{node.version}</td>
                      <td className="tg-mono">{node.liveHash.slice(0, 12)}…</td>
                      <td>{node.approvedBy ?? 'Pending'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};