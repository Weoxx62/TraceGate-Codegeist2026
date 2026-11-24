import { appendLedgerEntry, evaluateReleasePolicy } from '../../core/index';
import { syncLiveAtlassianNodes } from '../atlassian/clients';
import { loadSnapshot, saveSnapshot } from '../persistence/store';

export async function onConfluencePageUpdated(): Promise<void> {
  const previous = await loadSnapshot();
  const synced = await syncLiveAtlassianNodes(previous);

  const evalRes = evaluateReleasePolicy(
    synced.nodes,
    synced.edges,
    synced.releaseNodeId,
    'Confluence Event Trigger',
    synced.policy,
  );

  if (evalRes.driftedRootIds.length > 0) {
    const { nextLedger } = appendLedgerEntry(synced.ledger, {
      eventType: 'SPEC_DRIFT_DETECTED',
      actorId: 'avi:confluence:updated:page',
      releaseId: synced.releaseNodeId,
      verdict: evalRes.verdict,
      evidenceFingerprint: evalRes.evidenceFingerprint,
      summary: `Background Confluence trigger caught drift on ${evalRes.driftedRootIds.join(', ')}.`,
    });
    await saveSnapshot({ ...synced, ledger: nextLedger });
    return;
  }

  await saveSnapshot(synced);
}

export async function onJiraIssueUpdated(): Promise<void> {
  const snapshot = await loadSnapshot();
  const synced = await syncLiveAtlassianNodes(snapshot);
  await saveSnapshot(synced);
}
