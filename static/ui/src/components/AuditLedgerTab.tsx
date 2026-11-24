import React from 'react';
import type {
  LedgerEntry,
  LedgerVerificationResult,
} from '../../../../src/core/index';
import { DownloadIcon } from './Icons';

interface AuditLedgerTabProps {
  ledger: LedgerEntry[];
  verification: LedgerVerificationResult;
  tamperTestResult: string | null;
  busy: boolean;
  onRunTamperTest: () => void;
  onDismissTamperTest: () => void;
  onPreviewCertificate: () => void;
  onDownloadAuditPack: () => void;
  onDownloadCertificateHtml: () => void;
  onExportToConfluence: () => void;
}

export const AuditLedgerTab: React.FC<AuditLedgerTabProps> = ({
  ledger,
  verification,
  tamperTestResult,
  busy,
  onRunTamperTest,
  onDismissTamperTest,
  onPreviewCertificate,
  onDownloadAuditPack,
  onDownloadCertificateHtml,
  onExportToConfluence,
}) => {
  return (
    <section className="tg-card" aria-label="SHA-256 Tamper-Evident Audit Ledger">
      <div className="tg-card-head">
        <div className="tg-card-title">
          <span>SHA-256 Audit Ledger</span>
          <span
            className={`tg-pill ${
              verification.valid ? 'tg-pill-emerald' : 'tg-pill-coral'
            }`}
          >
            {verification.valid ? 'Chain Verified' : 'Chain Broken'}
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button
            type="button"
            className="tg-btn tg-btn-sm"
            onClick={onRunTamperTest}
          >
            Verify Integrity
          </button>
          <button
            type="button"
            className="tg-btn tg-btn-sm"
            onClick={onPreviewCertificate}
          >
            Preview Certificate
          </button>
          <button
            type="button"
            className="tg-btn tg-btn-sm"
            onClick={onDownloadAuditPack}
          >
            <DownloadIcon size={12} />
            Export (.md)
          </button>
          <button
            type="button"
            className="tg-btn tg-btn-sm"
            onClick={onDownloadCertificateHtml}
          >
            <DownloadIcon size={12} />
            Certificate (.html)
          </button>
          <button
            type="button"
            className="tg-btn tg-btn-sm tg-btn-primary"
            disabled={busy}
            onClick={onExportToConfluence}
          >
            Publish to Confluence
          </button>
        </div>
      </div>

      {tamperTestResult && (
        <div className="tg-toast tg-toast-info" style={{ margin: '12px 14px 0' }}>
          <span>{tamperTestResult}</span>
          <button
            type="button"
            className="tg-btn tg-btn-sm tg-btn-ghost"
            onClick={onDismissTamperTest}
          >
            Clear
          </button>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table className="tg-table">
          <thead>
            <tr>
              <th>Seq</th>
              <th>Event</th>
              <th>Actor</th>
              <th>Verdict</th>
              <th>Summary</th>
              <th>SHA-256 Hash</th>
            </tr>
          </thead>
          <tbody>
            {[...ledger].reverse().map((entry) => {
              const pillClass =
                entry.payload.verdict === 'ALLOW'
                  ? 'tg-pill-emerald'
                  : entry.payload.verdict === 'NEEDS_REVIEW'
                    ? 'tg-pill-amber'
                    : 'tg-pill-coral';

              return (
                <tr key={entry.index}>
                  <td className="tg-mono">#{entry.index}</td>
                  <td className="tg-mono">{entry.payload.eventType}</td>
                  <td>{entry.payload.actorId}</td>
                  <td>
                    <span className={`tg-pill ${pillClass}`}>{entry.payload.verdict}</span>
                  </td>
                  <td>{entry.payload.summary}</td>
                  <td className="tg-mono">{entry.entryHash.slice(0, 14)}…</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};
