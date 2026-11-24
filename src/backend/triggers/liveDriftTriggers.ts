import { appendLedgerEntry, evaluateReleasePolicy } from '../../core/index';
import { syncLiveAtlassianNodes } from '../atlassian/clients';
import { loadSnapshot, saveSnapshot } from '../persistence/store';

interface ConfluenceUpdatedEvent {
  content?: {
    id?: string | number;
  };
}

export async function onConfluencePageUpdated(
  event?: ConfluenceUpdatedEvent,
): Promise<void> {
  const previous = await loadSnapshot();
  if (!previous.seededConfluencePageId) return;

  const eventPageId = event?.content?.id;
  if (
    eventPageId !== undefined &&
    String(eventPageId) !== String(previous.seededConfluencePageId)
  ) {
    return;
  }

  const prevSpecHash = previous.nodes.find((n) => n.id === 'SPEC-BOLUS')?.liveHash;
  const synced = await syncLiveAtlassianNodes(previous);
  const syncedSpecHash = synced.nodes.find((n) => n.id === 'SPEC-BOLUS')?.liveHash;

  // Skip ledger entry if normalized content hash did not actually change
  if (!syncedSpecHash || syncedSpecHash === prevSpecHash) {
    return;
  }

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
  if (Object.keys(snapshot.seededJiraIssueKeys).length === 0) return;
  const synced = await syncLiveAtlassianNodes(snapshot);
  await saveSnapshot(synced);
}
