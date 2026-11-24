import React, { useEffect, useMemo, useRef, useState } from 'react';

export interface CommandItem {
  id: string;
  label: string;
  group: string;
  keywords?: string;
  shortcut?: string;
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  commands: CommandItem[];
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  commands,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.group.toLowerCase().includes(q) ||
        (cmd.keywords?.toLowerCase().includes(q) ?? false),
    );
  }, [commands, query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!open) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (filtered.length > 0 ? (i + 1) % filtered.length : 0));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) =>
        filtered.length > 0 ? (i - 1 + filtered.length) % filtered.length : 0,
      );
      return;
    }
    if (e.key === 'Enter' && filtered[activeIndex]) {
      e.preventDefault();
      filtered[activeIndex].run();
      onClose();
    }
  };

  return (
    <div
      className="tg-cmdk-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="TraceGate Command Palette"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="tg-cmdk" onKeyDown={handleKeyDown}>
        <div className="tg-cmdk-input-row">
          <input
            ref={inputRef}
            type="text"
            className="tg-cmdk-input"
            placeholder="Jump to artifact, switch industry baseline, or run MCP action…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search commands"
          />
          <span className="tg-kbd">Esc</span>
        </div>

        <div className="tg-cmdk-list" role="listbox">
          {filtered.length === 0 ? (
            <div style={{ padding: '14px 12px', color: 'var(--ink-muted)', fontSize: 12 }}>
              No matching artifacts or actions.
            </div>
          ) : (
            filtered.map((cmd, idx) => (
              <button
                key={cmd.id}
                type="button"
                role="option"
                aria-selected={idx === activeIndex}
                className={`tg-cmdk-item ${
                  idx === activeIndex ? 'tg-cmdk-item-active' : ''
                }`}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => {
                  cmd.run();
                  onClose();
                }}
              >
                <span>{cmd.label}</span>
                <span className="tg-cmdk-group">
                  {cmd.shortcut ?? cmd.group}
                </span>
              </button>
            ))
          )}
        </div>

        <div className="tg-cmdk-foot">
          <span>↑↓ Navigate · ↵ Run</span>
          <span>TraceGate Quick Launcher</span>
        </div>
      </div>
    </div>
  );
};
