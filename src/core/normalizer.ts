import type { ClauseDiff } from './types';

export interface NormalizedSpec {
  canonicalText: string;
  lines: string[];
}

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

/**
 * Pure deterministic SHA-256 hex digest over UTF-8 input.
 * Works identically in Node.js, Forge sandbox, and modern browsers without async crypto.
 */
export function sha256Hex(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const bitLen = bytes.length * 8;
  const totalLen = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(totalLen);
  padded.set(bytes);
  padded[bytes.length] = 0x80;

  const view = new DataView(padded.buffer);
  const highBits = Math.floor(bitLen / 0x100000000);
  const lowBits = bitLen >>> 0;
  view.setUint32(totalLen - 8, highBits, false);
  view.setUint32(totalLen - 4, lowBits, false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);
  for (let offset = 0; offset < totalLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 =
        ((w[i - 15] >>> 7) | (w[i - 15] << 25)) ^
        ((w[i - 15] >>> 18) | (w[i - 15] << 14)) ^
        (w[i - 15] >>> 3);
      const s1 =
        ((w[i - 2] >>> 17) | (w[i - 2] << 15)) ^
        ((w[i - 2] >>> 19) | (w[i - 2] << 13)) ^
        (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((n) => n.toString(16).padStart(8, '0'))
    .join('');
}

interface AdfNode {
  type?: string;
  text?: string;
  content?: AdfNode[];
}

function collectAdfBlocks(node: AdfNode, blocks: string[]): void {
  if (!node || typeof node !== 'object') return;
  if (typeof node.text === 'string') {
    blocks.push(node.text);
    return;
  }
  if (!Array.isArray(node.content)) return;

  const isBlockBoundary =
    node.type === 'paragraph' ||
    node.type === 'heading' ||
    node.type === 'tableRow' ||
    node.type === 'listItem' ||
    node.type === 'codeBlock';

  if (isBlockBoundary) {
    const inlineParts: string[] = [];
    for (const child of node.content) {
      collectAdfBlocks(child, inlineParts);
    }
    const line = inlineParts.join(node.type === 'tableRow' ? ' | ' : ' ').trim();
    if (line.length > 0) {
      blocks.push(line);
    }
    return;
  }

  for (const child of node.content) {
    collectAdfBlocks(child, blocks);
  }
}

/**
 * Extracts readable lines from Confluence ADF JSON, Confluence storage HTML,
 * or raw Markdown/plain text.
 */
export function extractTextFromAdfOrHtml(input: unknown): string {
  if (input === null || input === undefined) return '';
  if (typeof input === 'object') {
    const blocks: string[] = [];
    collectAdfBlocks(input as AdfNode, blocks);
    return blocks.join('\n');
  }

  const raw = String(input).trim();
  if (raw.startsWith('{') && raw.includes('"type"')) {
    try {
      const parsed = JSON.parse(raw) as AdfNode;
      const blocks: string[] = [];
      collectAdfBlocks(parsed, blocks);
      if (blocks.length > 0) {
        return blocks.join('\n');
      }
    } catch {
      // Fall through to plain text/HTML stripping
    }
  }

  const looksLikeHtml =
    /<\/?(p|div|span|table|thead|tbody|tr|td|th|h[1-6]|ul|ol|li|br|strong|em|b|i|a|code|pre|blockquote)\b[^>]*>/i.test(
      raw,
    );

  if (looksLikeHtml) {
    return raw
      .replace(/<\/(p|tr|h[1-6]|li|div|br)>/gi, '\n')
      .replace(/<\/t[dh]>/gi, ' | ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>');
  }

  return raw;
}

/**
 * Normalizes spec/ticket text so cosmetic edits (extra spaces, blank lines,
 * markdown bolding, trailing periods/commas) produce the exact same hash,
 * while numeric thresholds, units, identifiers, and wording stay exact.
 */
export function normalizeSpecContent(input: unknown): NormalizedSpec {
  const extracted = extractTextFromAdfOrHtml(input);
  const lines = extracted
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/[*_`~#]/g, '')
        .replace(/\s*\|\s*/g, ' | ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/[.,;]+$/g, '')
        .trim(),
    )
    .filter((line) => line.length > 0);

  return {
    canonicalText: lines.join('\n'),
    lines,
  };
}

export function hashSpecContent(input: unknown): {
  normalizedText: string;
  hash: string;
} {
  const { canonicalText } = normalizeSpecContent(input);
  return {
    normalizedText: canonicalText,
    hash: sha256Hex(canonicalText),
  };
}

function extractExplicitClauseKey(line: string): string | null {
  const bracketMatch = line.match(/^\[([A-Za-z0-9_.-]+)\]/);
  if (bracketMatch) return bracketMatch[1];

  const prefixedMatch = line.match(/^([A-Z][A-Z0-9_-]{2,32})\s*[:|]/);
  if (prefixedMatch) return prefixedMatch[1];

  return null;
}

function extractClauseKey(line: string, fallbackIndex: number): string {
  const explicit = extractExplicitClauseKey(line);
  if (explicit) return explicit;

  const anyBracket = line.match(/\[([A-Z0-9_-]+)\]/);
  if (anyBracket) return anyBracket[1];

  const colonIdx = line.indexOf(':');
  if (colonIdx > 0 && colonIdx < 48) {
    return line.slice(0, colonIdx).trim();
  }

  const pipeIdx = line.indexOf('|');
  if (pipeIdx > 0 && pipeIdx < 48) {
    return line.slice(0, pipeIdx).trim();
  }

  return `Line ${fallbackIndex + 1}`;
}

interface UnkeyedLine {
  index: number;
  text: string;
}

/**
 * Aligns unkeyed prose/header lines via LCS so inserting a header or note line
 * does not shift every subsequent line into a false MODIFIED diff.
 */
function diffUnkeyedLinesLcs(
  approved: UnkeyedLine[],
  live: UnkeyedLine[],
  nodeId: string,
  externalId: string,
): ClauseDiff[] {
  const m = approved.length;
  const n = live.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0),
  );

  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (approved[i].text === live[j].text) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const diffs: ClauseDiff[] = [];
  let i = 0;
  let j = 0;

  while (i < m && j < n) {
    if (approved[i].text === live[j].text) {
      i++;
      j++;
      continue;
    }

    const removedChunk: UnkeyedLine[] = [];
    const addedChunk: UnkeyedLine[] = [];
    while (
      (i < m || j < n) &&
      !(i < m && j < n && approved[i].text === live[j].text)
    ) {
      if (i < m && (j >= n || dp[i + 1][j] >= dp[i][j + 1])) {
        removedChunk.push(approved[i]);
        i++;
      } else if (j < n) {
        addedChunk.push(live[j]);
        j++;
      }
    }

    const paired = Math.min(removedChunk.length, addedChunk.length);
    for (let k = 0; k < paired; k++) {
      diffs.push({
        clauseKey: extractClauseKey(addedChunk[k].text, addedChunk[k].index),
        changeType: 'MODIFIED',
        approvedLine: removedChunk[k].text,
        liveLine: addedChunk[k].text,
        nodeId,
        externalId,
      });
    }
    for (let k = paired; k < addedChunk.length; k++) {
      diffs.push({
        clauseKey: extractClauseKey(addedChunk[k].text, addedChunk[k].index),
        changeType: 'ADDED',
        approvedLine: null,
        liveLine: addedChunk[k].text,
        nodeId,
        externalId,
      });
    }
    for (let k = paired; k < removedChunk.length; k++) {
      diffs.push({
        clauseKey: extractClauseKey(removedChunk[k].text, removedChunk[k].index),
        changeType: 'REMOVED',
        approvedLine: removedChunk[k].text,
        liveLine: null,
        nodeId,
        externalId,
      });
    }
  }

  while (i < m) {
    diffs.push({
      clauseKey: extractClauseKey(approved[i].text, approved[i].index),
      changeType: 'REMOVED',
      approvedLine: approved[i].text,
      liveLine: null,
      nodeId,
      externalId,
    });
    i++;
  }

  while (j < n) {
    diffs.push({
      clauseKey: extractClauseKey(live[j].text, live[j].index),
      changeType: 'ADDED',
      approvedLine: null,
      liveLine: live[j].text,
      nodeId,
      externalId,
    });
    j++;
  }

  return diffs;
}

/**
 * Computes deterministic clause-level differences between an approved spec snapshot
 * and the current live normalized text. Aligns explicit clause keys first so inserting
 * or reordering lines never creates cascading positional false positives.
 */
export function computeClauseDiffs(
  approvedText: string | null,
  liveText: string,
  nodeId: string,
  externalId: string,
): ClauseDiff[] {
  if (approvedText === null) return [];

  const approvedLines = normalizeSpecContent(approvedText).lines;
  const liveLines = normalizeSpecContent(liveText).lines;

  const approvedKeyMap = new Map<string, string>();
  const liveKeyMap = new Map<string, string>();
  const orderedKeys: string[] = [];
  const seenKeys = new Set<string>();

  const approvedUnkeyed: UnkeyedLine[] = [];
  const liveUnkeyed: UnkeyedLine[] = [];

  for (let i = 0; i < approvedLines.length; i++) {
    const line = approvedLines[i];
    const key = extractExplicitClauseKey(line);
    if (key && !approvedKeyMap.has(key)) {
      approvedKeyMap.set(key, line);
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        orderedKeys.push(key);
      }
    } else {
      approvedUnkeyed.push({ index: i, text: line });
    }
  }

  for (let i = 0; i < liveLines.length; i++) {
    const line = liveLines[i];
    const key = extractExplicitClauseKey(line);
    if (key && !liveKeyMap.has(key)) {
      liveKeyMap.set(key, line);
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        orderedKeys.push(key);
      }
    } else {
      liveUnkeyed.push({ index: i, text: line });
    }
  }

  const keyedDiffs: ClauseDiff[] = [];
  for (const key of orderedKeys) {
    const prev = approvedKeyMap.get(key) ?? null;
    const next = liveKeyMap.get(key) ?? null;
    if (prev === next) continue;

    if (prev !== null && next !== null) {
      keyedDiffs.push({
        clauseKey: key,
        changeType: 'MODIFIED',
        approvedLine: prev,
        liveLine: next,
        nodeId,
        externalId,
      });
    } else if (prev === null && next !== null) {
      keyedDiffs.push({
        clauseKey: key,
        changeType: 'ADDED',
        approvedLine: null,
        liveLine: next,
        nodeId,
        externalId,
      });
    } else if (prev !== null && next === null) {
      keyedDiffs.push({
        clauseKey: key,
        changeType: 'REMOVED',
        approvedLine: prev,
        liveLine: null,
        nodeId,
        externalId,
      });
    }
  }

  const unkeyedDiffs = diffUnkeyedLinesLcs(
    approvedUnkeyed,
    liveUnkeyed,
    nodeId,
    externalId,
  );

  return [...keyedDiffs, ...unkeyedDiffs];
}
