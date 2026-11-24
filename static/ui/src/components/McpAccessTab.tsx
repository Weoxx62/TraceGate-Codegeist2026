import React, { useState } from 'react';
import { CheckIcon, CopyIcon, DownloadIcon, TerminalIcon } from './Icons';

export type McpSimulatorTool =
  | 'evaluate-release-gate'
  | 'inspect-evidence-diff'
  | 'commit-governed-release';

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
  mcpOutput: string;
  busy: boolean;
  onRunTool: (tool: McpSimulatorTool) => void;
  onDownloadSkill: () => void;
}

export const McpAccessTab: React.FC<McpAccessTabProps> = ({
  mcpOutput,
  busy,
  onRunTool,
  onDownloadSkill,
}) => {
  const [copiedSkill, setCopiedSkill] = useState(false);

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

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button
              type="button"
              className="tg-btn tg-btn-sm tg-btn-primary tg-mono"
              disabled={busy}
              onClick={() => onRunTool('evaluate-release-gate')}
            >
              evaluate-release-gate
            </button>
            <button
              type="button"
              className="tg-btn tg-btn-sm tg-mono"
              disabled={busy}
              onClick={() => onRunTool('inspect-evidence-diff')}
            >
              inspect-evidence-diff
            </button>
            <button
              type="button"
              className="tg-btn tg-btn-sm tg-btn-emerald tg-mono"
              disabled={busy}
              onClick={() => onRunTool('commit-governed-release')}
            >
              commit-governed-release
            </button>
          </div>

          <pre className="tg-code">
            {mcpOutput || '// Select an MCP tool above to inspect its deterministic JSON payload.'}
          </pre>
        </div>
      </section>

      <section className="tg-card" aria-label="Open-Source Agent Skill">
        <div className="tg-card-head">
          <div className="tg-card-title">Agent SKILL.md</div>
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
          <pre className="tg-code">{SKILL_MD_TEMPLATE}</pre>
          <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
            Compatible with Claude Code, Cursor, Codex, and Atlassian Rovo Studio. Site admins enable external MCP under{' '}
            <span className="tg-mono">Connected apps</span>.
          </div>
        </div>
      </section>
    </div>
  );
};
