import type {
  BlastImpact,
  EvidenceEdge,
  EvidenceNode,
} from './types';

export interface GraphAnalysis {
  driftedRootIds: string[];
  temporallyStaleIds: string[];
  suspectNodeIds: string[];
  blastRadius: BlastImpact[];
  cycles: string[][];
  fmeaExposureTotal: number;
  upstreamByNode: Map<string, EvidenceNode[]>;
  downstreamByNode: Map<string, EvidenceNode[]>;
}

/**
 * Detects directed cycles in the traceability graph using three-color DFS.
 */
export function detectCycles(
  nodes: EvidenceNode[],
  edges: EvidenceEdge[],
): string[][] {
  const adjacency = new Map<string, string[]>();
  for (const node of nodes) {
    adjacency.set(node.id, []);
  }
  for (const edge of edges) {
    if (adjacency.has(edge.fromId) && adjacency.has(edge.toId)) {
      adjacency.get(edge.fromId)!.push(edge.toId);
    }
  }

  const state = new Map<string, 'UNVISITED' | 'VISITING' | 'DONE'>();
  for (const node of nodes) {
    state.set(node.id, 'UNVISITED');
  }

  const stack: string[] = [];
  const cycles: string[][] = [];

  function dfs(currentId: string): void {
    state.set(currentId, 'VISITING');
    stack.push(currentId);

    for (const nextId of adjacency.get(currentId) ?? []) {
      const nextState = state.get(nextId);
      if (nextState === 'VISITING') {
        const cycleStart = stack.indexOf(nextId);
        if (cycleStart !== -1) {
          cycles.push([...stack.slice(cycleStart), nextId]);
        }
      } else if (nextState === 'UNVISITED') {
        dfs(nextId);
      }
    }

    stack.pop();
    state.set(currentId, 'DONE');
  }

  for (const node of nodes) {
    if (state.get(node.id) === 'UNVISITED') {
      dfs(node.id);
    }
  }

  return cycles;
}

/**
 * Computes bounded BFS transitive blast radius starting from drifted or stale root nodes.
 * Handles cyclic graphs safely via visited tracking per source traversal.
 */
export function computeTransitiveBlastRadius(
  nodes: EvidenceNode[],
  edges: EvidenceEdge[],
  rootIds: string[],
  maxDepth = 10,
): BlastImpact[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const adjacency = new Map<string, string[]>();
  for (const node of nodes) {
    adjacency.set(node.id, []);
  }
  for (const edge of edges) {
    if (adjacency.has(edge.fromId) && nodeMap.has(edge.toId)) {
      adjacency.get(edge.fromId)!.push(edge.toId);
    }
  }

  const bestImpactByNode = new Map<string, BlastImpact>();

  for (const rootId of rootIds) {
    const rootNode = nodeMap.get(rootId);
    if (!rootNode) continue;

    const visited = new Set<string>([rootId]);
    const queue: Array<{ id: string; depth: number; path: string[] }> = [
      { id: rootId, depth: 0, path: [rootNode.externalId] },
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.depth > 0) {
        const targetNode = nodeMap.get(current.id)!;
        const rawRpn = targetNode.rpn
          ? targetNode.rpn.severity * targetNode.rpn.occurrence * targetNode.rpn.detection
          : 40;
        const weightedRisk = Number((rawRpn / (1 + 0.25 * current.depth)).toFixed(1));

        const existing = bestImpactByNode.get(current.id);
        if (!existing || current.depth < existing.depth || weightedRisk > existing.weightedRisk) {
          bestImpactByNode.set(current.id, {
            nodeId: targetNode.id,
            externalId: targetNode.externalId,
            title: targetNode.title,
            nodeType: targetNode.nodeType,
            pillar: targetNode.pillar,
            depth: current.depth,
            provenancePath: current.path,
            weightedRisk,
          });
        }
      }

      if (current.depth >= maxDepth) continue;

      for (const nextId of adjacency.get(current.id) ?? []) {
        if (visited.has(nextId)) continue;
        visited.add(nextId);
        const nextNode = nodeMap.get(nextId);
        if (!nextNode) continue;
        queue.push({
          id: nextId,
          depth: current.depth + 1,
          path: [...current.path, nextNode.externalId],
        });
      }
    }
  }

  return Array.from(bestImpactByNode.values()).sort(
    (a, b) => a.depth - b.depth || b.weightedRisk - a.weightedRisk,
  );
}

/**
 * Analyzes the full traceability graph: cryptographic drift roots, temporal staleness,
 * downstream BFS blast radius, cycles, and FMEA exposure.
 */
export function analyzeEvidenceGraph(
  nodes: EvidenceNode[],
  edges: EvidenceEdge[],
): GraphAnalysis {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const upstreamByNode = new Map<string, EvidenceNode[]>();
  const downstreamByNode = new Map<string, EvidenceNode[]>();

  for (const node of nodes) {
    upstreamByNode.set(node.id, []);
    downstreamByNode.set(node.id, []);
  }

  for (const edge of edges) {
    const from = nodeMap.get(edge.fromId);
    const to = nodeMap.get(edge.toId);
    if (!from || !to) continue;
    downstreamByNode.get(from.id)!.push(to);
    upstreamByNode.get(to.id)!.push(from);
  }

  const driftedRootIds: string[] = [];
  for (const node of nodes) {
    if (node.approvedHash !== null && node.liveHash !== node.approvedHash) {
      driftedRootIds.push(node.id);
    }
  }

  const temporallyStaleIds: string[] = [];
  for (const node of nodes) {
    if (node.nodeType === 'VERIFICATION_TEST') {
      const upstream = upstreamByNode.get(node.id) ?? [];
      const testTime = Date.parse(node.approvedAt ?? node.lastModifiedAt);
      const hasNewerUpstream = upstream.some(
        (u) => Date.parse(u.lastModifiedAt) > testTime,
      );
      if (hasNewerUpstream) {
        temporallyStaleIds.push(node.id);
      }
    }
  }

  const propagationSeeds = Array.from(new Set([...driftedRootIds, ...temporallyStaleIds]));
  const blastRadius = computeTransitiveBlastRadius(nodes, edges, propagationSeeds);
  const suspectSet = new Set<string>(blastRadius.map((b) => b.nodeId));
  for (const staleId of temporallyStaleIds) {
    suspectSet.add(staleId);
  }
  for (const node of nodes) {
    if (node.status === 'SUSPECT' || node.status === 'DRIFTED') {
      suspectSet.add(node.id);
    }
  }

  const cycles = detectCycles(nodes, edges);
  const fmeaExposureTotal = Number(
    blastRadius.reduce((sum, item) => sum + item.weightedRisk, 0).toFixed(1),
  );

  return {
    driftedRootIds,
    temporallyStaleIds,
    suspectNodeIds: Array.from(suspectSet),
    blastRadius,
    cycles,
    fmeaExposureTotal,
    upstreamByNode,
    downstreamByNode,
  };
}
