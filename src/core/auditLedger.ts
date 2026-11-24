import { sha256Hex } from './normalizer';
import type {
  LedgerEntry,
  LedgerEntryPayload,
  LedgerVerificationResult,
} from './types';

export const GENESIS_HASH = '0'.repeat(64);

/**
 * Deterministic canonical JSON serializer with recursively sorted keys.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  const sortedKeys = Object.keys(record).sort();
  const pairs = sortedKeys
    .filter((k) => record[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${canonicalJson(record[k])}`);
  return `{${pairs.join(',')}}`;
}

export function computeLedgerEntryHash(
  prevHash: string,
  timestamp: string,
  payload: LedgerEntryPayload,
): string {
  return sha256Hex(`${prevHash}|${timestamp}|${canonicalJson(payload)}`);
}

/**
 * Appends a new tamper-evident SHA-256 hash-chained entry to the audit ledger.
 */
export function appendLedgerEntry(
  ledger: LedgerEntry[],
  payload: LedgerEntryPayload,
  timestamp = new Date().toISOString(),
): { nextLedger: LedgerEntry[]; entry: LedgerEntry } {
  const prevHash =
    ledger.length > 0 ? ledger[ledger.length - 1].entryHash : GENESIS_HASH;
  const entry: LedgerEntry = {
    index: ledger.length,
    timestamp,
    prevHash,
    entryHash: computeLedgerEntryHash(prevHash, timestamp, payload),
    payload,
  };

  return {
    nextLedger: [...ledger, entry],
    entry,
  };
}

/**
 * Replays and verifies every link in the SHA-256 hash chain from genesis.
 * Returns the exact index where tampering or chain break occurred, if any.
 */
export function verifyLedgerChain(
  ledger: LedgerEntry[],
): LedgerVerificationResult {
  let expectedPrev = GENESIS_HASH;

  for (let i = 0; i < ledger.length; i++) {
    const item = ledger[i];
    if (item.prevHash !== expectedPrev) {
      return {
        valid: false,
        totalEntries: ledger.length,
        brokenAtIndex: i,
        expectedHash: expectedPrev,
        actualHash: item.prevHash,
      };
    }

    const recomputed = computeLedgerEntryHash(
      item.prevHash,
      item.timestamp,
      item.payload,
    );
    if (item.entryHash !== recomputed) {
      return {
        valid: false,
        totalEntries: ledger.length,
        brokenAtIndex: i,
        expectedHash: recomputed,
        actualHash: item.entryHash,
      };
    }

    expectedPrev = item.entryHash;
  }

  return {
    valid: true,
    totalEntries: ledger.length,
    brokenAtIndex: null,
    expectedHash: null,
    actualHash: null,
  };
}
