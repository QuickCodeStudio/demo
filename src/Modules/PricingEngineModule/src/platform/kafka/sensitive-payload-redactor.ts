/**
 * Nest parity of C# SensitivePayloadRedactor.
 * Built-in names cannot be removed. KAFKA_SENSITIVE_FIELDS is additive only.
 * Keep lists in sync with QuickCode.Common.SensitivePayloadRedactor (SensitivePayloadRedactorSyncTests).
 */

export const SENSITIVE_PAYLOAD_MASK = '***';
export const ADDITIONAL_FIELDS_ENV_VAR = 'KAFKA_SENSITIVE_FIELDS';

/** Normalized (lowercase, no _/- /space) JSON property names. */
export const DEFAULT_SENSITIVE_FIELD_NAMES = [
  'password',
  'passwd',
  'passphrase',
  'parola',
  'şifre',
  'sifre',
  'oldpassword',
  'newpassword',
  'confirmpassword',
  'currentpassword',
  'passwordhash',
  'hashedpassword',
  'passwordconfirmation',
  'token',
  'accesstoken',
  'refreshtoken',
  'idtoken',
  'bearertoken',
  'authtoken',
  'csrftoken',
  'sessiontoken',
  'secret',
  'clientsecret',
  'appsecret',
  'apisecret',
  'apikey',
  'privatekey',
  'resetcode',
  'resetpasswordcode',
  'twofactorcode',
  'twofactorrecoverycode',
  'otp',
  'pin',
] as const;

/** Normalized HTTP header names. */
export const DEFAULT_SENSITIVE_HEADER_NAMES = [
  'authorization',
  'cookie',
  'setcookie',
  'xapikey',
  'xauthtoken',
  'xaccesstoken',
] as const;

export const SENSITIVE_NAME_CONTAINS_TOKENS = [
  'password',
  'passwd',
  'şifre',
  'sifre',
  'parola',
  'apikey',
] as const;

export const SENSITIVE_NAME_SUFFIX_TOKENS = [
  'password',
  'token',
  'secret',
] as const;

const EXACT_NAMES = new Set<string>([
  ...DEFAULT_SENSITIVE_FIELD_NAMES,
  ...DEFAULT_SENSITIVE_HEADER_NAMES,
]);

export function normalizeSensitiveName(name: string | undefined | null): string {
  if (!name) return '';
  let out = '';
  for (const c of name) {
    if (c === '_' || c === '-' || c === ' ') continue;
    out += c.toLowerCase();
  }
  return out;
}

export function isSensitiveName(
  name: string | undefined | null,
  additionalNames?: readonly string[],
): boolean {
  const n = normalizeSensitiveName(name);
  if (!n) return false;
  if (EXACT_NAMES.has(n)) return true;
  if (additionalNames) {
    for (const extra of additionalNames) {
      if (n === normalizeSensitiveName(extra)) return true;
    }
  }
  for (const token of SENSITIVE_NAME_CONTAINS_TOKENS) {
    if (n.includes(token)) return true;
  }
  for (const suffix of SENSITIVE_NAME_SUFFIX_TOKENS) {
    if (n.length >= suffix.length && n.endsWith(suffix)) return true;
  }
  return false;
}

export function parseSensitiveCsv(value: string | undefined | null): string[] {
  if (!value || !value.trim()) return [];
  return value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export function additionalSensitiveNamesFromEnv(): string[] {
  return parseSensitiveCsv(process.env[ADDITIONAL_FIELDS_ENV_VAR]);
}

export function redactSensitivePayload(
  value: unknown,
  additionalNames?: readonly string[],
): unknown {
  const extras = combineAdditional(additionalNames);
  return redactClone(cloneJson(value), extras);
}

export function redactSensitiveHeaders(
  headers: Record<string, unknown> | undefined | null,
  additionalNames?: readonly string[],
): Record<string, string> {
  const extras = combineAdditional(additionalNames);
  const result: Record<string, string> = {};
  if (!headers) return result;
  for (const [key, raw] of Object.entries(headers)) {
    if (isSensitiveName(key, extras)) {
      result[key] = SENSITIVE_PAYLOAD_MASK;
    } else if (Array.isArray(raw)) {
      result[key] = raw.map((item) => String(item)).join(',');
    } else if (raw == null) {
      result[key] = '';
    } else {
      result[key] = String(raw);
    }
  }
  return result;
}

function combineAdditional(additionalNames?: readonly string[]): string[] {
  const fromEnv = additionalSensitiveNamesFromEnv();
  if (!additionalNames?.length) return fromEnv;
  return [...fromEnv, ...additionalNames.filter((n) => !!n && n.trim().length > 0)];
}

function cloneJson(value: unknown): unknown {
  if (value == null) return {};
  try {
    return structuredClone(value);
  } catch {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return {};
    }
  }
}

function redactClone(value: unknown, additionalNames: readonly string[]): unknown {
  if (value == null || typeof value !== 'object') return value ?? {};
  if (Array.isArray(value)) {
    for (const item of value) {
      redactClone(item, additionalNames);
    }
    return value;
  }

  const obj = value as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (isSensitiveName(key, additionalNames)) {
      obj[key] = SENSITIVE_PAYLOAD_MASK;
    } else {
      const child = obj[key];
      if (child != null && typeof child === 'object') {
        redactClone(child, additionalNames);
      }
    }
  }
  return obj;
}
