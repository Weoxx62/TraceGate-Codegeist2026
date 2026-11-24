import React, { useMemo, useState } from 'react';
import {
  computeConnectedLineageIds,
  type EvaluationResult,
  type EvidenceEdge,
  type EvidenceNode,
} from '../../../../src/core/index';

interface NodeSlot {
  x: number;
  y: number;
}

const NODE_WIDTH = 190;
const NODE_HEIGHT = 60;

const NODE_POSITIONS: Record<string, NodeSlot> = {
  'SPEC-BOLUS': { x: 8, y: 38 },
  'SPEC-ALARM': { x: 8, y: 158 },
  'REQ-101': { x: 232, y: 28 },
  'FMEA-301': { x: 232, y: 98 },
  'REQ-102': { x: 232, y: 168 },
  'TEST-401': { x: 456, y: 28 },
  'TEST-403': { x: 456, y: 98 },
  'TEST-402': { x: 456, y: 168 },
  'FW-240': { x: 680, y: 98 },
  'REL-240': { x: 904, y: 98 },
};

const STAGE_LABELS = [
  { x: 10, label: '01 · SPECIFICATION' },
  { x: 234, label: '02 · WORK & RISK' },
  { x: 458, label: '03 · VERIFICATION' },
  { x: 682, label: '04 · ARTIFACT' },
  { x: 906, label: '05 · RELEASE GATE' },
];

const COLUMN_HAIRLINES = [215, 439, 663, 887];

function formatShortTitle(title: string, max = 24): string {
  if (title.length <= max) return title;
  const slice = title.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(' ');
  return `${(lastSpace > 11 ? slice.slice(0, lastSpace) : slice).trim()}…`;
}

function formatShortId(externalId: string, max = 12): string {
  if (externalId.length <= max) return externalId;
  return `${externalId.slice(0, max - 1)}…`;
}

interface NodeStyle {
  dot: string;
  labelColor: string;
  borderColor: string;
  statusWord: string;
}

function getNodeStyle(
  node: EvidenceNode,
  evaluation: EvaluationResult,
): NodeStyle {
  if (evaluation.driftedRootIds.includes(node.id)) {
    return {
      dot: 'var(--coral)',
      labelColor: 'var(--coral)',
      borderColor: 'var(--coral-border)',
      statusWord: 'Drifted',
    };
  }
  if (node.id === evaluation.releaseId && evaluation.verdict === 'BLOCK') {
    return {
      dot: 'var(--coral)',
      labelColor: 'var(--coral)',
      borderColor: 'var(--coral-border)',
      statusWord: 'Blocked',
    };
  }
  if (evaluation.suspectNodeIds.includes(node.id)) {
    return {
      dot: 'var(--amber)',
      labelColor: 'var(--amber)',
      borderColor: 'var(--amber-border)',
      statusWord: 'Suspect',
    };
  }
  if (node.status === 'RELEASED') {
    return {
      dot: 'var(--emerald)',
      labelColor: 'var(--emerald)',
      borderColor: 'var(--emerald-border)',
      statusWord: 'Released',
    };
  }
  return {
    dot: 'var(--emerald)',
    labelColor: 'var(--emerald)',
    borderColor: 'var(--border)',
    statusWord: 'Verified',
  };
}

export const EvidenceGraphCanvas: React.FC<{
  nodes: EvidenceNode[];
  edges: EvidenceEdge[];
  evaluation: EvaluationResult;
  selectedNodeId: string;
  onSelectNode: (nodeId: string) => void;
}> = ({ nodes, edges, evaluation, selectedNodeId, onSelectNode }) => {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const impactedIds = new Set([
    ...evaluation.driftedRootIds,
    ...evaluation.suspectNodeIds,
  ]);

  const activeFocus = useMemo(() => {
    if (!hoveredNodeId) return null;
    return computeConnectedLineageIds(hoveredNodeId, edges);
  }, [hoveredNodeId, edges]);

  const blastByNode = useMemo(
    () => new Map(evaluation.blastRadius.map((b) => [b.nodeId, b])),
    [evaluation.blastRadius],
  );

  return (
    <svg
      viewBox="0 0 1102 246"
      style={{ width: '100%', height: 'auto', display: 'block' }}
      role="region"
      aria-label="Evidence Lineage Graph"
    >
      <defs>
        <marker
          id="v3-arrow-clean"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto"
        >
          <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="var(--svg-edge-clean)" />
        </marker>
        <marker
          id="v3-arrow-impact"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto"
        >
          <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="var(--svg-edge-impact)" />
        </marker>
      </defs>

      {COLUMN_HAIRLINES.map((x) => (
        <line
          key={x}
          x1={x}
          y1={8}
          x2={x}
          y2={234}
          stroke="var(--border)"
          strokeDasharray="3 3"
          opacity={0.55}
        />
      ))}

      {STAGE_LABELS.map((stage) => (
        <text
          key={stage.label}
          x={stage.x}
          y={16}
          fontSize="10"
          fontWeight="600"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
          letterSpacing="0.04em"
          fill="var(--ink-muted)"
        >
          {stage.label}
        </text>
      ))}

      {edges.map((edge) => {
        const from = NODE_POSITIONS[edge.fromId];
        const to = NODE_POSITIONS[edge.toId];
        if (!from || !to) return null;

        const isImpacted =
          impactedIds.has(edge.fromId) &&
          (impactedIds.has(edge.toId) || edge.toId === evaluation.releaseId);

        const edgeKey = `${edge.fromId}->${edge.toId}`;
        const dimmed = activeFocus !== null && !activeFocus.edgeKeys.has(edgeKey);

        const x1 = from.x + NODE_WIDTH;
        const y1 = from.y + NODE_HEIGHT / 2;
        const x2 = to.x;
        const y2 = to.y + NODE_HEIGHT / 2;
        const midX = (x1 + x2) / 2;

        return (
          <path
            key={edgeKey}
            d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
            className={isImpacted ? 'tg-edge-impact-anim' : undefined}
            fill="none"
            stroke={isImpacted ? 'var(--svg-edge-impact)' : 'var(--svg-edge-clean)'}
            strokeWidth={isImpacted ? 1.8 : 1.3}
            strokeDasharray={isImpacted ? '4 3' : undefined}
            style={{
              opacity: dimmed ? 0.16 : 1,
              transition: 'opacity 150ms ease',
            }}
            markerEnd={
              isImpacted ? 'url(#v3-arrow-impact)' : 'url(#v3-arrow-clean)'
            }
          />
        );
      })}

      {nodes.map((node) => {
        const pos = NODE_POSITIONS[node.id];
        if (!pos) return null;

        const style = getNodeStyle(node, evaluation);
        const isSelected = node.id === selectedNodeId;
        const isHovered = node.id === hoveredNodeId;
        const dimmed = activeFocus !== null && !activeFocus.nodeIds.has(node.id);
        const impactInfo = blastByNode.get(node.id);

        const rightLabel =
          (isHovered || isSelected) && impactInfo
            ? `Hop +${impactInfo.depth} · ${style.statusWord}`
            : style.statusWord;

        const metaText = node.rpn
          ? `RPN ${node.rpn.severity * node.rpn.occurrence * node.rpn.detection} · ${node.liveHash.slice(0, 7)}`
          : `${node.sourceProduct} · v${node.version} · ${node.liveHash.slice(0, 7)}`;

        return (
          <g
            key={node.id}
            transform={`translate(${pos.x}, ${pos.y})`}
            role="button"
            tabIndex={0}
            aria-label={`Inspect ${node.externalId}: ${node.title} (${style.statusWord})`}
            aria-pressed={isSelected}
            onClick={() => onSelectNode(node.id)}
            onMouseEnter={() => setHoveredNodeId(node.id)}
            onMouseLeave={() => setHoveredNodeId(null)}
            onFocus={() => setHoveredNodeId(node.id)}
            onBlur={() => setHoveredNodeId(null)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectNode(node.id);
              }
            }}
            style={{
              cursor: 'pointer',
              opacity: dimmed ? 0.25 : 1,
              transition: 'opacity 150ms ease',
            }}
          >
            <rect
              width={NODE_WIDTH}
              height={NODE_HEIGHT}
              rx={8}
              fill={isSelected ? 'var(--svg-node-selected)' : 'var(--svg-node-bg)'}
              stroke={
                isSelected || isHovered
                  ? 'var(--accent)'
                  : style.borderColor
              }
              strokeWidth={isSelected ? 1.6 : isHovered ? 1.3 : 1}
            />
            <rect x={1} y={10} width={3} height={40} rx={1.5} fill={style.dot} />
            <circle cx={15} cy={17} r={3.2} fill={style.dot} />
            <text
              x={24}
              y={20.5}
              fontSize="10.5"
              fontWeight="600"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
              fill="var(--ink-secondary)"
            >
              {formatShortId(node.externalId, 12)}
            </text>
            <text
              x={NODE_WIDTH - 10}
              y={20.5}
              textAnchor="end"
              fontSize="10"
              fontWeight="600"
              fill={style.labelColor}
            >
              {rightLabel}
            </text>
            <text
              x={12}
              y={36.5}
              fontSize="11.5"
              fontWeight="500"
              fill="var(--ink-primary)"
            >
              {formatShortTitle(node.title, 24)}
            </text>
            <text
              x={12}
              y={52}
              fontSize="9.5"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
              fill="var(--ink-muted)"
            >
              {metaText}
            </text>
          </g>
        );
      })}
    </svg>
  );
};