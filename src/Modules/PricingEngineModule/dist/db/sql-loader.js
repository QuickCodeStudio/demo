"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadSql = loadSql;
exports.bindNamedParamsMap = bindNamedParamsMap;
exports.bindNamedParams = bindNamedParams;
exports.executeNamedSqlScript = executeNamedSqlScript;
exports.executeSqlScript = executeSqlScript;
exports.firstRow = firstRow;
exports.asRows = asRows;
exports.affectedCount = affectedCount;
exports.scalarNumber = scalarNumber;
const fs_1 = require("fs");
const path_1 = require("path");
const cache = new Map();
function stripBom(text) {
    return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}
function resolveSqlRoot() {
    return (0, path_1.resolve)(__dirname, '..', '..', 'sql');
}
function detectDbType() {
    return (process.env.DB_TYPE || process.env.TYPEORM_TYPE || 'mssql').toLowerCase();
}
function loadSql(className, kind, scriptName) {
    const key = `${className}/${kind}/${scriptName}`;
    const hit = cache.get(key);
    if (hit !== undefined)
        return hit;
    const fileName = `${className}.${scriptName}.g.sql`;
    const fullPath = (0, path_1.join)(resolveSqlRoot(), className, kind, fileName);
    if (!(0, fs_1.existsSync)(fullPath)) {
        throw new Error(`QuickCode SQL script not found: ${fullPath}`);
    }
    const sql = stripBom((0, fs_1.readFileSync)(fullPath, 'utf8'));
    cache.set(key, sql);
    return sql;
}
function lookupNamed(named, token) {
    if (Object.prototype.hasOwnProperty.call(named, token))
        return named[token];
    if (Object.prototype.hasOwnProperty.call(named, `@${token}`))
        return named[`@${token}`];
    const upper = token.toUpperCase();
    for (const [k, v] of Object.entries(named)) {
        if (k.replace(/^@/, '').toUpperCase() === upper)
            return v;
    }
    return null;
}
function bindNamedParamsMap(sql, named, dbType = detectDbType()) {
    const params = [];
    const text = sql.replace(/@([A-Za-z_][A-Za-z0-9_]*)/g, (match, name) => {
        if (/^\d+$/.test(name))
            return match;
        params.push(lookupNamed(named, name));
        if (dbType === 'postgresql' || dbType === 'postgres')
            return `$${params.length}`;
        if (dbType === 'mysql')
            return '?';
        return `@${params.length - 1}`;
    });
    return { text, params };
}
function bindNamedParams(sql, values, dbType = detectDbType()) {
    const params = [];
    let i = 0;
    const text = sql.replace(/@([A-Za-z_][A-Za-z0-9_]*)/g, (match, name) => {
        if (/^\d+$/.test(name))
            return match;
        params.push(values[i++] ?? null);
        if (dbType === 'postgresql' || dbType === 'postgres')
            return `$${params.length}`;
        if (dbType === 'mysql')
            return '?';
        return `@${params.length - 1}`;
    });
    return { text, params };
}
async function executeNamedSqlScript(dataSource, className, kind, scriptName, named = {}) {
    const raw = loadSql(className, kind, scriptName);
    const { text, params } = bindNamedParamsMap(raw, named);
    return dataSource.query(text, params);
}
async function executeSqlScript(dataSource, className, kind, scriptName, values = []) {
    const raw = loadSql(className, kind, scriptName);
    const { text, params } = bindNamedParams(raw, values);
    return dataSource.query(text, params);
}
function firstRow(result) {
    if (Array.isArray(result)) {
        if (result.length === 0)
            return null;
        const first = result[0];
        return first && typeof first === 'object' ? first : null;
    }
    if (result && typeof result === 'object')
        return result;
    return null;
}
function asRows(result) {
    if (Array.isArray(result)) {
        return result.filter((r) => !!r && typeof r === 'object');
    }
    return [];
}
function affectedCount(result) {
    if (typeof result === 'number')
        return result;
    if (Array.isArray(result)) {
        if (result.length === 2 && typeof result[1] === 'number')
            return result[1];
        if (result.length === 2 && Array.isArray(result[1]) && typeof result[1][0] === 'number') {
            return result[1][0];
        }
        return result.length;
    }
    if (result && typeof result === 'object') {
        const r = result;
        if (typeof r.affectedRows === 'number')
            return r.affectedRows;
        if (typeof r.rowCount === 'number')
            return r.rowCount;
        if (Array.isArray(r.rowsAffected) && typeof r.rowsAffected[0] === 'number') {
            return r.rowsAffected[0];
        }
    }
    return 0;
}
function scalarNumber(result) {
    if (typeof result === 'number')
        return result;
    if (typeof result === 'bigint')
        return Number(result);
    const row = firstRow(result);
    if (!row)
        return 0;
    const first = Object.values(row)[0];
    if (typeof first === 'bigint')
        return Number(first);
    return Number(first ?? 0);
}
//# sourceMappingURL=sql-loader.js.map