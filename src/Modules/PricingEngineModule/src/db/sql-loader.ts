import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { DataSource } from 'typeorm';

const cache = new Map<string, string>();

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** Module root = src/Modules/{M}/ (dist/db → ../..) */
function resolveSqlRoot(): string {
  return resolve(__dirname, '..', '..', 'sql');
}

function detectDbType(): string {
  return (process.env.DB_TYPE || process.env.TYPEORM_TYPE || 'mssql').toLowerCase();
}

/**
 * Load QuickCode Query/Command/Crud script — same files C# embeds via SqlLoader.
 * File: sql/{ClassName}/{Query|Command|Crud}/{ClassName}.{ScriptName}.g.sql
 */
export function loadSql(
  className: string,
  kind: 'Query' | 'Command' | 'Crud',
  scriptName: string,
): string {
  const key = `${className}/${kind}/${scriptName}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  const fileName = `${className}.${scriptName}.g.sql`;
  const fullPath = join(resolveSqlRoot(), className, kind, fileName);
  if (!existsSync(fullPath)) {
    throw new Error(`QuickCode SQL script not found: ${fullPath}`);
  }

  const sql = stripBom(readFileSync(fullPath, 'utf8'));
  cache.set(key, sql);
  return sql;
}

function lookupNamed(named: Record<string, unknown>, token: string): unknown {
  if (Object.prototype.hasOwnProperty.call(named, token)) return named[token];
  if (Object.prototype.hasOwnProperty.call(named, `@${token}`)) return named[`@${token}`];
  const upper = token.toUpperCase();
  for (const [k, v] of Object.entries(named)) {
    if (k.replace(/^@/, '').toUpperCase() === upper) return v;
  }
  return null;
}

/** Bind @Named parameters (Dapper-style) by name. */
export function bindNamedParamsMap(
  sql: string,
  named: Record<string, unknown>,
  dbType = detectDbType(),
): { text: string; params: unknown[] } {
  const params: unknown[] = [];
  const text = sql.replace(/@([A-Za-z_][A-Za-z0-9_]*)/g, (match, name: string) => {
    if (/^\d+$/.test(name)) return match;
    params.push(lookupNamed(named, name));
    if (dbType === 'postgresql' || dbType === 'postgres') return `$${params.length}`;
    if (dbType === 'mysql') return '?';
    return `@${params.length - 1}`;
  });
  return { text, params };
}

/**
 * Bind @Named parameters in appearance order to a positional values array
 * (legacy Filter/Update note callers).
 */
export function bindNamedParams(
  sql: string,
  values: unknown[],
  dbType = detectDbType(),
): { text: string; params: unknown[] } {
  const params: unknown[] = [];
  let i = 0;
  const text = sql.replace(/@([A-Za-z_][A-Za-z0-9_]*)/g, (match, name: string) => {
    if (/^\d+$/.test(name)) return match;
    params.push(values[i++] ?? null);
    if (dbType === 'postgresql' || dbType === 'postgres') return `$${params.length}`;
    if (dbType === 'mysql') return '?';
    return `@${params.length - 1}`;
  });
  return { text, params };
}

/** Execute a .g.sql script with named @PRM_* params (C# Dapper parity). */
export async function executeNamedSqlScript(
  dataSource: DataSource,
  className: string,
  kind: 'Query' | 'Command' | 'Crud',
  scriptName: string,
  named: Record<string, unknown> = {},
): Promise<unknown> {
  const raw = loadSql(className, kind, scriptName);
  const { text, params } = bindNamedParamsMap(raw, named);
  return dataSource.query(text, params);
}

/** Execute a .g.sql script with positional args matching @param order. */
export async function executeSqlScript(
  dataSource: DataSource,
  className: string,
  kind: 'Query' | 'Command' | 'Crud',
  scriptName: string,
  values: unknown[] = [],
): Promise<unknown> {
  const raw = loadSql(className, kind, scriptName);
  const { text, params } = bindNamedParams(raw, values);
  return dataSource.query(text, params);
}

export function firstRow(result: unknown): Record<string, unknown> | null {
  if (Array.isArray(result)) {
    if (result.length === 0) return null;
    const first = result[0];
    return first && typeof first === 'object' ? (first as Record<string, unknown>) : null;
  }
  if (result && typeof result === 'object') return result as Record<string, unknown>;
  return null;
}

export function asRows(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) {
    return result.filter((r): r is Record<string, unknown> => !!r && typeof r === 'object');
  }
  return [];
}

export function affectedCount(result: unknown): number {
  if (typeof result === 'number') return result;
  if (Array.isArray(result)) {
    // mssql driver sometimes returns [[], rowsAffected]
    if (result.length === 2 && typeof result[1] === 'number') return result[1];
    if (result.length === 2 && Array.isArray(result[1]) && typeof (result[1] as number[])[0] === 'number') {
      return (result[1] as number[])[0];
    }
    return result.length;
  }
  if (result && typeof result === 'object') {
    const r = result as Record<string, unknown>;
    if (typeof r.affectedRows === 'number') return r.affectedRows;
    if (typeof r.rowCount === 'number') return r.rowCount;
    if (Array.isArray(r.rowsAffected) && typeof r.rowsAffected[0] === 'number') {
      return r.rowsAffected[0] as number;
    }
  }
  return 0;
}

/** First numeric cell from COUNT(*) / scalar query results. */
export function scalarNumber(result: unknown): number {
  if (typeof result === 'number') return result;
  if (typeof result === 'bigint') return Number(result);
  const row = firstRow(result);
  if (!row) return 0;
  const first = Object.values(row)[0];
  if (typeof first === 'bigint') return Number(first);
  return Number(first ?? 0);
}
