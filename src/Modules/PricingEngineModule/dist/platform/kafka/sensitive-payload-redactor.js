"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SENSITIVE_NAME_SUFFIX_TOKENS = exports.SENSITIVE_NAME_CONTAINS_TOKENS = exports.DEFAULT_SENSITIVE_HEADER_NAMES = exports.DEFAULT_SENSITIVE_FIELD_NAMES = exports.ADDITIONAL_FIELDS_ENV_VAR = exports.SENSITIVE_PAYLOAD_MASK = void 0;
exports.normalizeSensitiveName = normalizeSensitiveName;
exports.isSensitiveName = isSensitiveName;
exports.parseSensitiveCsv = parseSensitiveCsv;
exports.additionalSensitiveNamesFromEnv = additionalSensitiveNamesFromEnv;
exports.redactSensitivePayload = redactSensitivePayload;
exports.redactSensitiveHeaders = redactSensitiveHeaders;
exports.SENSITIVE_PAYLOAD_MASK = '***';
exports.ADDITIONAL_FIELDS_ENV_VAR = 'KAFKA_SENSITIVE_FIELDS';
exports.DEFAULT_SENSITIVE_FIELD_NAMES = [
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
];
exports.DEFAULT_SENSITIVE_HEADER_NAMES = [
    'authorization',
    'cookie',
    'setcookie',
    'xapikey',
    'xauthtoken',
    'xaccesstoken',
];
exports.SENSITIVE_NAME_CONTAINS_TOKENS = [
    'password',
    'passwd',
    'şifre',
    'sifre',
    'parola',
    'apikey',
];
exports.SENSITIVE_NAME_SUFFIX_TOKENS = [
    'password',
    'token',
    'secret',
];
const EXACT_NAMES = new Set([
    ...exports.DEFAULT_SENSITIVE_FIELD_NAMES,
    ...exports.DEFAULT_SENSITIVE_HEADER_NAMES,
]);
function normalizeSensitiveName(name) {
    if (!name)
        return '';
    let out = '';
    for (const c of name) {
        if (c === '_' || c === '-' || c === ' ')
            continue;
        out += c.toLowerCase();
    }
    return out;
}
function isSensitiveName(name, additionalNames) {
    const n = normalizeSensitiveName(name);
    if (!n)
        return false;
    if (EXACT_NAMES.has(n))
        return true;
    if (additionalNames) {
        for (const extra of additionalNames) {
            if (n === normalizeSensitiveName(extra))
                return true;
        }
    }
    for (const token of exports.SENSITIVE_NAME_CONTAINS_TOKENS) {
        if (n.includes(token))
            return true;
    }
    for (const suffix of exports.SENSITIVE_NAME_SUFFIX_TOKENS) {
        if (n.length >= suffix.length && n.endsWith(suffix))
            return true;
    }
    return false;
}
function parseSensitiveCsv(value) {
    if (!value || !value.trim())
        return [];
    return value
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
}
function additionalSensitiveNamesFromEnv() {
    return parseSensitiveCsv(process.env[exports.ADDITIONAL_FIELDS_ENV_VAR]);
}
function redactSensitivePayload(value, additionalNames) {
    const extras = combineAdditional(additionalNames);
    return redactClone(cloneJson(value), extras);
}
function redactSensitiveHeaders(headers, additionalNames) {
    const extras = combineAdditional(additionalNames);
    const result = {};
    if (!headers)
        return result;
    for (const [key, raw] of Object.entries(headers)) {
        if (isSensitiveName(key, extras)) {
            result[key] = exports.SENSITIVE_PAYLOAD_MASK;
        }
        else if (Array.isArray(raw)) {
            result[key] = raw.map((item) => String(item)).join(',');
        }
        else if (raw == null) {
            result[key] = '';
        }
        else {
            result[key] = String(raw);
        }
    }
    return result;
}
function combineAdditional(additionalNames) {
    const fromEnv = additionalSensitiveNamesFromEnv();
    if (!additionalNames?.length)
        return fromEnv;
    return [...fromEnv, ...additionalNames.filter((n) => !!n && n.trim().length > 0)];
}
function cloneJson(value) {
    if (value == null)
        return {};
    try {
        return structuredClone(value);
    }
    catch {
        try {
            return JSON.parse(JSON.stringify(value));
        }
        catch {
            return {};
        }
    }
}
function redactClone(value, additionalNames) {
    if (value == null || typeof value !== 'object')
        return value ?? {};
    if (Array.isArray(value)) {
        for (const item of value) {
            redactClone(item, additionalNames);
        }
        return value;
    }
    const obj = value;
    for (const key of Object.keys(obj)) {
        if (isSensitiveName(key, additionalNames)) {
            obj[key] = exports.SENSITIVE_PAYLOAD_MASK;
        }
        else {
            const child = obj[key];
            if (child != null && typeof child === 'object') {
                redactClone(child, additionalNames);
            }
        }
    }
    return obj;
}
//# sourceMappingURL=sensitive-payload-redactor.js.map