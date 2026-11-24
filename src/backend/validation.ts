import { INDUSTRY_PRESETS, type IndustryPreset } from '../core/index';

export const MAX_RAW_CONTENT_LENGTH = 16_384;
export const MAX_THRESHOLD_LENGTH = 64;
export const MAX_ACTOR_LENGTH = 120;

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function sanitizeControlChars(
  input: string,
  preserveNewlines = false,
): string {
  let out = '';
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    if (code === 0) continue;
    if (preserveNewlines && (code === 10 || code === 13 || code === 9)) {
      out += input[i];
      continue;
    }
    if (code < 32 || code === 127) continue;
    out += input[i];
  }
  return out;
}

export function validateProjectKey(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') {
    throw new ValidationError('Invalid Jira project key type.');
  }
  const clean = value.trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9_]{0,19}$/.test(clean)) {
    throw new ValidationError('Invalid Jira project key format.');
  }
  return clean;
}

export function validateSpaceId(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value !== 'string') {
    throw new ValidationError('Invalid Confluence space ID.');
  }
  const clean = value.trim();
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(clean)) {
    throw new ValidationError('Invalid Confluence space ID format.');
  }
  return clean;
}

export function validateSpaceKey(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value !== 'string') {
    throw new ValidationError('Invalid Confluence space key.');
  }
  const clean = value.trim();
  if (!/^[a-zA-Z0-9_~-]{1,64}$/.test(clean)) {
    throw new ValidationError('Invalid Confluence space key format.');
  }
  return clean;
}

export function validateNodeId(
  value: unknown,
  allowedIds: Iterable<string>,
): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError('Missing nodeId.');
  }
  const clean = value.trim();
  const allowed = new Set(allowedIds);
  if (!allowed.has(clean)) {
    throw new ValidationError(`Unknown artifact nodeId "${clean.slice(0, 32)}".`);
  }
  return clean;
}

export function validateRawContent(value: unknown): string {
  if (typeof value !== 'string') {
    throw new ValidationError('Specification content must be a string.');
  }
  const sanitized = sanitizeControlChars(value, true);
  if (sanitized.trim().length === 0) {
    throw new ValidationError('Specification content cannot be empty.');
  }
  if (sanitized.length > MAX_RAW_CONTENT_LENGTH) {
    throw new ValidationError(
      `Specification content exceeds ${MAX_RAW_CONTENT_LENGTH} character limit.`,
    );
  }
  return sanitized;
}

export function validateSha256Hex(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const clean = value.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(clean)) {
    return null;
  }
  return clean;
}

export function validateIndustryPreset(
  value: unknown,
): IndustryPreset | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || !(value in INDUSTRY_PRESETS)) {
    throw new ValidationError('Unsupported regulated industry preset.');
  }
  return value as IndustryPreset;
}

export function validateThresholdOverride(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') {
    throw new ValidationError('Threshold override must be a string.');
  }
  const clean = sanitizeControlChars(value, false).trim();
  if (clean.length === 0 || clean.length > MAX_THRESHOLD_LENGTH) {
    throw new ValidationError(
      `Threshold override must be 1..${MAX_THRESHOLD_LENGTH} characters.`,
    );
  }
  return clean;
}

export function sanitizeActorLabel(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const clean = sanitizeControlChars(value, false).trim().slice(0, MAX_ACTOR_LENGTH);
  return clean.length > 0 ? clean : fallback;
}

export function toSafeErrorMessage(err: unknown): string {
  if (err instanceof ValidationError) {
    return err.message;
  }
  return 'Internal TraceGate operation failed.';
}
