import React from 'react';
import type { IndustryPreset } from '../../../../src/core/index';
import {
  FileCheckIcon,
  GitBranchIcon,
  MoonIcon,
  ShieldCheckIcon,
  SunIcon,
  TerminalIcon,
} from './Icons';
import { TraceGateLogo } from './TraceGateLogo';

export type StudioView = 'graph' | 'mcp' | 'ledger';

const PRESET_NAV: Array<{
  id: IndustryPreset;
  name: string;
  std: string;
}> = [
  { id: 'MEDTECH_IEC62304', name: 'CardioPulse Pump', std: 'IEC 62304' },
  { id: 'FINTECH_DORA', name: 'InstantSEPA Core', std: 'EU DORA' },
  { id: 'AUTOMOTIVE_ISO26262', name: 'DriveShield ADAS', std: 'ISO 26262' },
];

interface LeftSidebarProps {
  activePresetId: IndustryPreset;
  activeView: StudioView;
  ledgerCount: number;
  isForgeRuntime: boolean;
  theme: 'dark' | 'light';
  busy: boolean;
  onSelectPreset: (preset: IndustryPreset) => void;
  onSelectView: (view: StudioView) => void;
  onToggleTheme: () => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  activePresetId,
  activeView,
  ledgerCount,
  isForgeRuntime,
  theme,
  busy,
  onSelectPreset,
  onSelectView,
  onToggleTheme,
}) => {
  return (
    <aside className="tg-sidebar" aria-label="Workspace Navigation">
      <div className="tg-sidebar-brand">
        <div className="tg-sidebar-brand-left">
          <TraceGateLogo size={22} />
          <span>TraceGate</span>
        </div>
        <span className="tg-pill tg-pill-neutral" style={{ fontSize: 10 }}>
          v2.4
        </span>
      </div>

      <div className="tg-sidebar-body">
        <div>
          <div className="tg-nav-label">Regulated Releases</div>
          <nav className="tg-nav-list" aria-label="Industry Baselines">
            {PRESET_NAV.map((item) => {
              const active = activePresetId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={busy}
                  aria-pressed={active}
                  onClick={() => onSelectPreset(item.id)}
                  className={`tg-nav-item ${active ? 'tg-nav-item-active' : ''}`}
                >
                  <span className="tg-nav-left">
                    <ShieldCheckIcon size={13} />
                    <span className="tg-nav-title">{item.name}</span>
                  </span>
                  <span className="tg-nav-sub">{item.std}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div>
          <div className="tg-nav-label">Workspace</div>
          <nav className="tg-nav-list" aria-label="Views">
            <button
              type="button"
              aria-current={activeView === 'graph' ? 'page' : undefined}
              onClick={() => onSelectView('graph')}
              className={`tg-nav-item ${activeView === 'graph' ? 'tg-nav-item-active' : ''}`}
            >
              <span className="tg-nav-left">
                <GitBranchIcon size={13} />
                <span className="tg-nav-title">Release Gate</span>
              </span>
            </button>

            <button
              type="button"
              aria-current={activeView === 'mcp' ? 'page' : undefined}
              onClick={() => onSelectView('mcp')}
              className={`tg-nav-item ${activeView === 'mcp' ? 'tg-nav-item-active' : ''}`}
            >
              <span className="tg-nav-left">
                <TerminalIcon size={13} />
                <span className="tg-nav-title">MCP &amp; Agents</span>
              </span>
            </button>

            <button
              type="button"
              aria-current={activeView === 'ledger' ? 'page' : undefined}
              onClick={() => onSelectView('ledger')}
              className={`tg-nav-item ${activeView === 'ledger' ? 'tg-nav-item-active' : ''}`}
            >
              <span className="tg-nav-left">
                <FileCheckIcon size={13} />
                <span className="tg-nav-title">Audit Ledger</span>
              </span>
              <span className="tg-nav-badge">{ledgerCount}</span>
            </button>
          </nav>
        </div>
      </div>

      <div className="tg-sidebar-footer">
        <div className="tg-runtime-chip">
          <span
            className={`tg-dot ${isForgeRuntime ? 'tg-dot-emerald' : 'tg-dot-accent'}`}
            aria-hidden="true"
          />
          <span>{isForgeRuntime ? 'Forge Runtime' : 'Local Studio'}</span>
        </div>

        <button
          type="button"
          className="tg-btn tg-btn-sm tg-btn-ghost"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          {theme === 'dark' ? <SunIcon size={13} /> : <MoonIcon size={13} />}
          <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>
      </div>
    </aside>
  );
};
