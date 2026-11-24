import { kvs } from '@forge/kvs';
import { sql, migrationRunner } from '@forge/sql';
import {
  buildMedTechDemoSnapshot,
  type EvidenceEdge,
  type EvidenceGraphSnapshot,
  type EvidenceNode,
  type LedgerEntry,
} from '../../core/index';

const KVS_SNAPSHOT_KEY = 'tg:snapshot:v1';

const MIGRATION_DDL = [
  {
    name: 'v001_tg_meta',
    sql: `CREATE TABLE IF NOT EXISTS tg_meta (
      meta_key VARCHAR(64) PRIMARY KEY,
      meta_value LONGTEXT NOT NULL,
      updated_at VARCHAR(40) NOT NULL
    );`,
  },
  {
    name: 'v002_tg_nodes',
    sql: `CREATE TABLE IF NOT EXISTS tg_nodes (
      id VARCHAR(64) PRIMARY KEY,
      external_id VARCHAR(64) NOT NULL,
      source_product VARCHAR(24) NOT NULL,
      pillar VARCHAR(24) NOT NULL,
      node_type VARCHAR(32) NOT NULL,
      title VARCHAR(255) NOT NULL,
      status VARCHAR(24) NOT NULL,
      version INT NOT NULL,
      live_hash VARCHAR(64) NOT NULL,
      approved_hash VARCHAR(64) NULL,
      payload_json LONGTEXT NOT NULL
    );`,
  },
  {
    name: 'v003_tg_edges',
    sql: `CREATE TABLE IF NOT EXISTS tg_edges (
      edge_id VARCHAR(140) PRIMARY KEY,
      from_id VARCHAR(64) NOT NULL,
      to_id VARCHAR(64) NOT NULL,
      relation VARCHAR(32) NOT NULL
    );`,
  },
  {
    name: 'v004_tg_ledger',
    sql: `CREATE TABLE IF NOT EXISTS tg_ledger (
      entry_index INT PRIMARY KEY,
      timestamp_iso VARCHAR(40) NOT NULL,
      prev_hash VARCHAR(64) NOT NULL,
      entry_hash VARCHAR(64) NOT NULL,
      event_type VARCHAR(64) NOT NULL,
      payload_json LONGTEXT NOT NULL
    );`,
  },
];

let migrationsInitialized = false;

export interface StorageDiagnostics {
  sqlAvailable: boolean;
  kvsAvailable: boolean;
  sqlError: string | null;
}

async function ensureSqlMigrations(): Promise<{ ok: boolean; error: string | null }> {
  if (migrationsInitialized) return { ok: true, error: null };
  try {
    let runner = migrationRunner.enqueue(MIGRATION_DDL[0].name, MIGRATION_DDL[0].sql);
    for (let i = 1; i < MIGRATION_DDL.length; i++) {
      runner = runner.enqueue(MIGRATION_DDL[i].name, MIGRATION_DDL[i].sql);
    }
    await runner.run();
    migrationsInitialized = true;
    return { ok: true, error: null };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function persistToSql(snapshot: EvidenceGraphSnapshot): Promise<void> {
  const mig = await ensureSqlMigrations();
  if (!mig.ok) return;

  const metaEnvelope = {
    workspaceKey: snapshot.workspaceKey,
    projectKey: snapshot.projectKey,
    confluenceSpaceKey: snapshot.confluenceSpaceKey,
    industryPreset: snapshot.industryPreset,
    scenarioTitle: snapshot.scenarioTitle,
    releaseNodeId: snapshot.releaseNodeId,
    policy: snapshot.policy,
    seededJiraIssueKeys: snapshot.seededJiraIssueKeys,
    seededConfluencePageId: snapshot.seededConfluencePageId,
    lastSyncedAt: snapshot.lastSyncedAt,
  };

  await sql
    .prepare(
      `INSERT INTO tg_meta (meta_key, meta_value, updated_at) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE meta_value = VALUES(meta_value), updated_at = VALUES(updated_at);`,
    )
    .bindParams('snapshot_meta', JSON.stringify(metaEnvelope), snapshot.lastSyncedAt)
    .execute();

  await sql.prepare('DELETE FROM tg_nodes;').execute();
  for (const node of snapshot.nodes) {
    await sql
      .prepare(
        `INSERT INTO tg_nodes (id, external_id, source_product, pillar, node_type, title, status, version, live_hash, approved_hash, payload_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      )
      .bindParams(
        node.id,
        node.externalId,
        node.sourceProduct,
        node.pillar,
        node.nodeType,
        node.title.slice(0, 250),
        node.status,
        node.version,
        node.liveHash,
        node.approvedHash ?? null,
        JSON.stringify(node),
      )
      .execute();
  }

  await sql.prepare('DELETE FROM tg_edges;').execute();
  for (const edge of snapshot.edges) {
    const edgeId = `${edge.fromId}->${edge.toId}:${edge.relation}`.slice(0, 138);
    await sql
      .prepare(
        `INSERT INTO tg_edges (edge_id, from_id, to_id, relation) VALUES (?, ?, ?, ?);`,
      )
      .bindParams(edgeId, edge.fromId, edge.toId, edge.relation)
      .execute();
  }

  await sql.prepare('DELETE FROM tg_ledger;').execute();
  for (const entry of snapshot.ledger) {
    await sql
      .prepare(
        `INSERT INTO tg_ledger (entry_index, timestamp_iso, prev_hash, entry_hash, event_type, payload_json)
         VALUES (?, ?, ?, ?, ?, ?);`,
      )
      .bindParams(
        entry.index,
        entry.timestamp,
        entry.prevHash,
        entry.entryHash,
        entry.payload.eventType,
        JSON.stringify(entry),
      )
      .execute();
  }
}

async function readFromSql(): Promise<EvidenceGraphSnapshot | null> {
  const mig = await ensureSqlMigrations();
  if (!mig.ok) return null;

  const metaRes = await sql
    .prepare<{ meta_value: string }>(
      `SELECT meta_value FROM tg_meta WHERE meta_key = ? LIMIT 1;`,
    )
    .bindParams('snapshot_meta')
    .execute();

  if (!metaRes.rows || metaRes.rows.length === 0) return null;

  const meta = JSON.parse(metaRes.rows[0].meta_value) as Omit<
    EvidenceGraphSnapshot,
    'nodes' | 'edges' | 'ledger'
  >;

  const nodesRes = await sql
    .prepare<{ payload_json: string }>(`SELECT payload_json FROM tg_nodes;`)
    .execute();
  const edgesRes = await sql
    .prepare<{ from_id: string; to_id: string; relation: string }>(
      `SELECT from_id, to_id, relation FROM tg_edges;`,
    )
    .execute();
  const ledgerRes = await sql
    .prepare<{ payload_json: string }>(
      `SELECT payload_json FROM tg_ledger ORDER BY entry_index ASC;`,
    )
    .execute();

  const nodes = (nodesRes.rows ?? []).map(
    (r: { payload_json: string }) => JSON.parse(r.payload_json) as EvidenceNode,
  );
  const edges = (edgesRes.rows ?? []).map(
    (r: { from_id: string; to_id: string; relation: string }) => ({
      fromId: r.from_id,
      toId: r.to_id,
      relation: r.relation as EvidenceEdge['relation'],
    }),
  );
  const ledger = (ledgerRes.rows ?? []).map(
    (r: { payload_json: string }) => JSON.parse(r.payload_json) as LedgerEntry,
  );

  if (nodes.length === 0) return null;

  return {
    ...meta,
    nodes,
    edges,
    ledger,
  };
}

export async function loadSnapshot(): Promise<EvidenceGraphSnapshot> {
  try {
    const sqlSnapshot = await readFromSql();
    if (sqlSnapshot) return sqlSnapshot;
  } catch {
    // Fall back to KVS storage
  }

  try {
    const stored = await kvs.get<EvidenceGraphSnapshot>(KVS_SNAPSHOT_KEY);
    if (stored && Array.isArray(stored.nodes) && stored.nodes.length > 0) {
      return stored;
    }
  } catch {
    // Fall back to fresh default demo snapshot
  }

  const initial = buildMedTechDemoSnapshot('DRIFTED', {
    workspaceKey: 'forge-initial',
  });
  await saveSnapshot(initial);
  return initial;
}

export async function saveSnapshot(
  snapshot: EvidenceGraphSnapshot,
): Promise<void> {
  await kvs.set(KVS_SNAPSHOT_KEY, snapshot);
  try {
    await persistToSql(snapshot);
  } catch {
    // KVS already persisted; SQL sync is best-effort during cold provisioning
  }
}

export async function getStorageDiagnostics(): Promise<StorageDiagnostics> {
  const sqlCheck = await ensureSqlMigrations();
  let kvsOk = false;
  try {
    await kvs.get(KVS_SNAPSHOT_KEY);
    kvsOk = true;
  } catch {
    kvsOk = false;
  }

  return {
    sqlAvailable: sqlCheck.ok,
    kvsAvailable: kvsOk,
    sqlError: sqlCheck.error,
  };
}
