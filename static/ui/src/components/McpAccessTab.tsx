import React, { useState } from 'react';
import type { WorkspaceBundle } from '../bridge/forgeClient';
import {
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  ShieldCheckIcon,
  TerminalIcon,
} from './Icons';

export type McpSimulatorTool =
  | 'evaluate-release-gate'
  | 'inspect-evidence-diff'
  | 'commit-governed-release'
  | 'simulate-rogue-commit';

type RovoStarterKey = 'ship' | 'drift' | 'bypass';

export const SKILL_MD_TEMPLATE = `---
name: tracegate-mcp
description: Mandatory compliance & evidence gate check via TraceGate Atlassian MCP before modifying regulated components or transitioning Jira releases.
---

# TraceGate Governance Workflow
1. Call \`evaluate-release-gate\` first and capture \`evidenceFingerprint\`.
2. If \`verdict === "BLOCK"\`, call \`inspect-evidence-diff\` to list exact SHA-256 clause drifts and downstream suspect tests.
3. Call \`create-remediation-tasks\` for unresolved gaps (Segregation of Duties prohibits self-approval).
4. Only when \`verdict === "ALLOW"\`, call \`commit-governed-release\` with \`expectedFingerprint\`.`;

interface McpAccessTabProps {
  bundle: WorkspaceBundle;
  mcpOutput: string;
  busy: boolean;
  onRunTool: (tool: McpSimulatorTool) => void;
  onDownloadSkill: () => void;
}

export const McpAccessTab: React.FC<McpAccessTabProps> = ({
  bundle,
  mcpOutput,
  busy,
  onRunTool,
  onDownloadSkill,
}) => {
  const [rightTab, setRightTab] = useState<'rovo' | 'skill'>('rovo');
  const [starter, setStarter] = useState<RovoStarterKey>('ship');
  const [copiedSkill, setCopiedSkill] = useState(false);

  const { snapshot, evaluation } = bundle;
  const firstDiff = evaluation.clauseDiffs[0];
  const fpShort = evaluation.evidenceFingerprint.slice(0, 16);

  const rovoPreview = (() => {
    if (starter === 'drift') {
      return {
        prompt: 'What specification drifted and which Jira tests are suspect?',
        toolUsed: 'inspect-evidence-diff',
        reply: firstDiff
          ? `${firstDiff.externalId} mutated on clause ${firstDiff.clauseKey} ("${firstDiff.approvedLine}" → "${firstDiff.liveLine}"). Downstream BFS flagged ${evaluation.blastRadius.length} suspect artifact(s) (${evaluation.blastRadius.map((b) => b.externalId).slice(0, 4).join(', ')}). Total FMEA exposure: ${evaluation.fmeaExposureTotal} RPN.`
          : `Zero SHA-256 specification drift detected on ${snapshot.scenarioTitle}. All ${snapshot.nodes.length} traceability artifacts match QA baselines.`,
      };
    }
    if (starter === 'bypass') {
      return {
        prompt: 'Skip QA sign-off and execute commit-governed-release now.',
        toolUsed: 'commit-governed-release (Two-Phase Guard)',
        reply:
          evaluation.verdict === 'ALLOW'
            ? `Phase 2 Commit still refuses forged/stale digests. Caller must supply live SHA-256 fingerprint ${fpShort}… and pass independent QA verification.`
            : `Blocked (COMMIT_REJECTED_EVIDENCE_CHANGED). Segregation of Duties & Two-Phase Commit prohibit bypassing ${evaluation.blockers.length} unresolved blocker(s). Independent Lead QA co-signature required first.`,
      };
    }
    return {
      prompt: 'Check if the active regulated release is safe to ship.',
      toolUsed: 'evaluate-release-gate',
      reply:
        evaluation.verdict === 'ALLOW'
          ? `Verdict ALLOW (100% Ship-Confidence) for ${snapshot.scenarioTitle}. All 5 deterministic predicates pass with 0 blockers. Ready for commit-governed-release with fingerprint ${fpShort}….`
          : `Verdict ${evaluation.verdict} (${evaluation.confidenceScore}% Ship-Confidence). ${evaluation.blockers.length} compliance blocker(s) active across ${evaluation.blastRadius.length} artifacts. Release transition held on ${snapshot.releaseNodeId} (fingerprint ${fpShort}…).`,
    };
  })();

  const handleCopySkill = async () => {
    try {
      await navigator.clipboard.writeText(SKILL_MD_TEMPLATE);
      setCopiedSkill(true);
      setTimeout(() => setCopiedSkill(false), 1800);
    } catch {
      setCopiedSkill(false);
    }
  };

  return (
    <div className="tg-two-col">
      <section className="tg-card" aria-label="Atlassian MCP Tool Explorer">
        <div className="tg-card-head">
          <div className="tg-card-title">
            <TerminalIcon size={14} />
            <span>Atlassian MCP Explorer</span>
            <span className="tg-pill tg-pill-neutral tg-mono">rovo:mcp</span>
          </div>
        </div>

        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--ink-secondary)' }}>
            Executes the deterministic Forge actions shared by external MCP agents and the{' '}
            <strong style={{ color: 'var(--ink-primary)' }}>TraceGate Compliance Auditor</strong> Rovo agent.
          </div>

          <div className="tg-mcp-grid">
            <button
              type="button"
              className="tg-mcp-btn tg-mcp-btn-primary"
              disabled={busy}
              onClick={() => onRunTool('evaluate-release-gate')}
            >
              <span className="tg-mcp-verb">GET</span>
              <span className="tg-mono">evaluate-release-gate</span>
            </button>
            <button
              type="button"
              className="tg-mcp-btn"
              disabled={busy}
              onClick={() => onRunTool('inspect-evidence-diff')}
            >
              <span className="tg-mcp-verb">GET</span>
              <span className="tg-mono">inspect-evidence-diff</span>
            </button>
            <button
              type="button"
              className="tg-mcp-btn tg-mcp-btn-emerald"
              disabled={busy}
              onClick={() => onRunTool('commit-governed-release')}
            >
              <span className="tg-mcp-verb">UPDATE</span>
              <span className="tg-mono">commit-governed-release</span>
            </button>
            <button
              type="button"
              className="tg-mcp-btn tg-mcp-btn-coral"
              disabled={busy}
              title="Tests OWASP LLM06 Two-Phase Commit protection against forged or stale fingerprints"
              onClick={() => onRunTool('simulate-rogue-commit')}
            >
              <span className="tg-mcp-verb">LLM06 TEST</span>
              <span className="tg-mono">test-unverified-commit</span>
            </button>
          </div>

          <pre className="tg-code">
            {mcpOutput || '// Select an MCP tool above to inspect its deterministic JSON payload.'}
          </pre>
        </div>
      </section>

      <section className="tg-card" aria-label="Rovo Agent and Open-Source Skill">
        <div className="tg-card-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="tg-seg" role="tablist" aria-label="Agent Integration Mode">
              <button
                type="button"
                role="tab"
                aria-selected={rightTab === 'rovo'}
                className={`tg-seg-btn ${rightTab === 'rovo' ? 'tg-seg-active' : ''}`}
                onClick={() => setRightTab('rovo')}
              >
                Rovo Agent
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={rightTab === 'skill'}
                className={`tg-seg-btn ${rightTab === 'skill' ? 'tg-seg-active' : ''}`}
                onClick={() => setRightTab('skill')}
              >
                SKILL.md
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className="tg-btn tg-btn-sm"
              onClick={() => void handleCopySkill()}
            >
              {copiedSkill ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
              {copiedSkill ? 'Copied' : 'Copy'}
            </button>
            <button
              type="button"
              className="tg-btn tg-btn-sm"
              onClick={onDownloadSkill}
            >
              <DownloadIcon size={12} />
              Download
            </button>
          </div>
        </div>

        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rightTab === 'rovo' ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600 }}>
                  <ShieldCheckIcon size={14} />
                  <span>TraceGate Compliance Auditor</span>
                </div>
                <span className="tg-pill tg-pill-neutral tg-mono">rovo:agent</span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <button
                  type="button"
                  className={`tg-rovo-chip ${starter === 'ship' ? 'tg-rovo-chip-active' : ''}`}
                  onClick={() => setStarter('ship')}
                >
                  Safe to ship?
                </button>
                <button
                  type="button"
                  className={`tg-rovo-chip ${starter === 'drift' ? 'tg-rovo-chip-active' : ''}`}
                  onClick={() => setStarter('drift')}
                >
                  Blast radius?
                </button>
                <button
                  type="button"
                  className={`tg-rovo-chip ${starter === 'bypass' ? 'tg-rovo-chip-active' : ''}`}
                  onClick={() => setStarter('bypass')}
                >
                  Force-commit?
                </button>
              </div>

              <div className="tg-rovo-card">
                <div className="tg-rovo-q">“{rovoPreview.prompt}”</div>
                <div className="tg-rovo-tool">
                  Action invoked: <span className="tg-mono">{rovoPreview.toolUsed}</span>
                </div>
                <div className="tg-rovo-a">{rovoPreview.reply}</div>
              </div>

              <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                Zero-hallucination prompt enforces deterministic <span className="tg-mono">evaluate-release-gate</span> checks before citing any Jira or Confluence artifact.
              </div>
            </>
          ) : (
            <>
              <pre className="tg-code">{SKILL_MD_TEMPLATE}</pre>
              <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                Compatible with Claude Code, Cursor, Codex, and Atlassian Rovo Studio. Site admins enable external MCP under{' '}
                <span className="tg-mono">Connected apps</span>.
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
};