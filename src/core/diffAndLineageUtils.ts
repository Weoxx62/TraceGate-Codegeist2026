import type { EvidenceEdge } from './types';

export interface InlineTokenDiff {
  prefix: string;
  removed: string;
  added: string;
  suffix: string;
}

/**
 * Splits two specification clause lines along token boundaries into a minimal
 * common prefix/suffix and changed middle span so UIs can highlight exact
 * parameter changes such as `10U` -> `15U` or `<= 45ms` -> `<= 85ms`.
 */
export function computeInlineTokenDiff(
  oldLine: string | null,
  newLine: string | null,
): InlineTokenDiff {
  const prev = oldLine ?? '';
  const next = newLine ?? '';
  if (prev === next) {
    return { prefix: prev, removed: '', added: '', suffix: '' };
  }

  const prevTokens = prev.match(/\S+|\s+/g) ?? [];
  const nextTokens = next.match(/\S+|\s+/g) ?? [];

  let start = 0;
  while (
    start < prevTokens.length &&
    start < nextTokens.length &&
    prevTokens[start] === nextTokens[start]
  ) {
    start++;
  }

  let prevEnd = prevTokens.length - 1;
  let nextEnd = nextTokens.length - 1;
  while (
    prevEnd >= start &&
    nextEnd >= start &&
    prevTokens[prevEnd] === nextTokens[nextEnd]
  ) {
    prevEnd--;
    nextEnd--;
  }

  return {
    prefix: prevTokens.slice(0, start).join(''),
    removed: prevTokens.slice(start, prevEnd + 1).join(''),
    added: nextTokens.slice(start, nextEnd + 1).join(''),
    suffix: prevTokens.slice(prevEnd + 1).join(''),
  };
}

/**
 * Performs cycle-safe bidirectional BFS from `rootId` to identify every artifact
 * causally connected upstream or downstream in the evidence DAG.
 */
export function computeConnectedLineageIds(
  rootId: string,
  edges: EvidenceEdge[],
): { nodeIds: Set<string>; edgeKeys: Set<string> } {
  const forward = new Map<string, string[]>();
  const reverse = new Map<string, string[]>();

  for (const edge of edges) {
    const down = forward.get(edge.fromId) ?? [];
    down.push(edge.toId);
    forward.set(edge.fromId, down);

    const up = reverse.get(edge.toId) ?? [];
    up.push(edge.fromId);
    reverse.set(edge.toId, up);
  }

  const nodeIds = new Set<string>([rootId]);
  const walk = (adj: Map<string, string[]>) => {
    const queue = [rootId];
    const visited = new Set<string>([rootId]);
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const neighbor of adj.get(current) ?? []) {
        nodeIds.add(neighbor);
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
  };

  walk(forward);
  walk(reverse);

  const edgeKeys = new Set<string>();
  for (const edge of edges) {
    if (nodeIds.has(edge.fromId) && nodeIds.has(edge.toId)) {
      edgeKeys.add(`${edge.fromId}->${edge.toId}`);
    }
  }

  return { nodeIds, edgeKeys };
}
