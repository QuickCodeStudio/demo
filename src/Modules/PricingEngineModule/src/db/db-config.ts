import { Logger } from '@nestjs/common';
import { Client as PgClient } from 'pg';
import * as sql from 'mssql';
import * as mysql from 'mysql2/promise';

/** QuickCode / C# AppSettings values: postgresql | mssql | mysql | postgres | sqlserver */
export type QuickCodeDbType = 'postgresql' | 'mssql' | 'mysql';

export function normalizeDbType(raw?: string): QuickCodeDbType {
  const t = (raw ?? process.env.DB_TYPE ?? 'postgresql').trim().toLowerCase();
  if (t === 'postgres' || t === 'postgresql') return 'postgresql';
  if (t === 'mysql') return 'mysql';
  if (t === 'mssql' || t === 'sqlserver' || t === 'sql server') return 'mssql';
  return 'postgresql';
}

/** TypeORM driver name (postgres, not postgresql). */
export function toTypeOrmDriver(dbType: QuickCodeDbType): 'postgres' | 'mssql' | 'mysql' {
  return dbType === 'postgresql' ? 'postgres' : dbType;
}

export function scriptSuffix(dbType: QuickCodeDbType): string {
  return `.${dbType}.sql`;
}

export function defaultPort(dbType: QuickCodeDbType): number {
  switch (dbType) {
    case 'mssql':
      return 1433;
    case 'mysql':
      return 3306;
    default:
      return 5432;
  }
}

export function defaultUser(dbType: QuickCodeDbType): string {
  switch (dbType) {
    case 'mssql':
      return 'sa';
    default:
      return 'docker';
  }
}

export function defaultPassword(dbType: QuickCodeDbType): string {
  switch (dbType) {
    case 'mssql':
      return 'Pass@word';
    default:
      return 'dockerf';
  }
}

export interface DbConnectionEnv {
  dbType: QuickCodeDbType;
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

/**
 * Cloud Run module workflows historically inject only ADO.NET-style
 * READ/WRITE_CONNECTION_STRING (C#). Nest/Rust/Java need DB_* — hydrate from
 * the connection string when DB_HOST is unset so migrate/seed can reach SQL
 * before listen (otherwise Cloud Run reports PORT not ready).
 */
export function applyConnectionStringEnvFallback(): void {
  if ((process.env.DB_HOST ?? '').trim()) return;
  const raw =
    process.env.READ_CONNECTION_STRING?.trim() ||
    process.env.WRITE_CONNECTION_STRING?.trim();
  if (!raw) return;

  const map = parseAdoStyleConnectionString(raw);
  const host =
    map['data source'] ||
    map['server'] ||
    map['host'] ||
    map['addr'] ||
    map['address'];
  if (!host) return;

  const [hostOnly, portFromHost] = splitHostPort(host);
  process.env.DB_HOST = hostOnly;

  const catalog =
    map['initial catalog'] || map['database'] || map['db'];
  if (catalog) process.env.DB_DATABASE = catalog;

  const user = map['user id'] || map['uid'] || map['username'] || map['user'];
  if (user) process.env.DB_USERNAME = user;

  const password = map['password'] || map['pwd'];
  if (password) process.env.DB_PASSWORD = password;

  const port =
    map['port'] ||
    portFromHost ||
    (looksLikeMssql(map) ? '1433' : undefined);
  if (port) process.env.DB_PORT = port;

  if (!(process.env.DB_TYPE ?? '').trim()) {
    if (looksLikeMssql(map)) process.env.DB_TYPE = 'mssql';
    else if (map['uid'] || map['pwd'] || map['server']) process.env.DB_TYPE = 'mysql';
    else if (map['host'] || map['username']) process.env.DB_TYPE = 'postgresql';
  }
}

function looksLikeMssql(map: Record<string, string>): boolean {
  return !!(map['data source'] || map['initial catalog'] || map['user id']);
}

function parseAdoStyleConnectionString(raw: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim().toLowerCase();
    const value = part.slice(idx + 1).trim();
    if (key) map[key] = value;
  }
  return map;
}

function splitHostPort(host: string): [string, string | undefined] {
  let h = host.trim();
  if (h.toLowerCase().startsWith('tcp:')) h = h.slice(4);
  // host,1433 (SQL Server) or host:1433
  const comma = h.lastIndexOf(',');
  if (comma > 0) {
    const maybePort = h.slice(comma + 1).trim();
    if (/^\d+$/.test(maybePort)) return [h.slice(0, comma).trim(), maybePort];
  }
  const colon = h.lastIndexOf(':');
  if (colon > 0 && h.indexOf(':') === colon) {
    const maybePort = h.slice(colon + 1).trim();
    if (/^\d+$/.test(maybePort)) return [h.slice(0, colon).trim(), maybePort];
  }
  return [h, undefined];
}

export function readDbConnectionEnv(): DbConnectionEnv {
  applyConnectionStringEnvFallback();
  const dbType = normalizeDbType();
  return {
    dbType,
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? defaultPort(dbType)),
    user: process.env.DB_USERNAME ?? defaultUser(dbType),
    password: process.env.DB_PASSWORD ?? defaultPassword(dbType),
    database: process.env.DB_DATABASE ?? 'demo',
  };
}

/**
 * Nest equivalent of C# QuickCodeRelationalDatabaseProvisioner —
 * creates the target database if missing (same dialects as .NET).
 */
export async function ensureDatabaseExists(): Promise<void> {
  const logger = new Logger('QuickCodeDatabaseProvisioner');
  const env = readDbConnectionEnv();
  if (!env.database?.trim()) return;

  switch (env.dbType) {
    case 'postgresql':
      await ensurePostgres(env, logger);
      break;
    case 'mssql':
      await ensureMssql(env, logger);
      break;
    case 'mysql':
      await ensureMysql(env, logger);
      break;
  }
}

async function ensurePostgres(env: DbConnectionEnv, logger: Logger): Promise<void> {
  const adminCandidates = [
    process.env.DB_ADMIN_DATABASE,
    'postgres',
    env.user,
    'template1',
  ].filter((x): x is string => !!x && x !== env.database);

  let lastError: unknown;
  for (const adminDb of adminCandidates) {
    const client = new PgClient({
      host: env.host,
      port: env.port,
      user: env.user,
      password: env.password,
      database: adminDb,
    });
    try {
      await client.connect();
      const quoted = env.database.replace(/"/g, '""');
      try {
        await client.query(`CREATE DATABASE "${quoted}" WITH ENCODING = 'UTF8'`);
        logger.log(`PostgreSQL: database '${env.database}' created.`);
      } catch (err: any) {
        if (err?.code === '42P04') {
          logger.log(`PostgreSQL: database '${env.database}' already exists.`);
        } else {
          throw err;
        }
      }
      await client.end();
      return;
    } catch (err) {
      lastError = err;
      try {
        await client.end();
      } catch {
        /* ignore */
      }
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(`PostgreSQL: could not ensure database '${env.database}'`);
}

async function ensureMssql(env: DbConnectionEnv, logger: Logger): Promise<void> {
  const pool = await sql.connect({
    server: env.host,
    port: env.port,
    user: env.user,
    password: env.password,
    database: 'master',
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
  });
  try {
    const nameLiteral = env.database.replace(/'/g, "''");
    const nameBracket = env.database.replace(/]/g, ']]');
    await pool
      .request()
      .query(
        `IF DB_ID(N'${nameLiteral}') IS NULL CREATE DATABASE [${nameBracket}];`,
      );
    logger.log(`SQL Server: database '${env.database}' is available (created if missing).`);
  } finally {
    await pool.close();
  }
}

async function ensureMysql(env: DbConnectionEnv, logger: Logger): Promise<void> {
  const conn = await mysql.createConnection({
    host: env.host,
    port: env.port,
    user: env.user,
    password: env.password,
    // no database — connect to server
  });
  try {
    const safe = env.database.replace(/`/g, '``');
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${safe}\``);
    logger.log(`MySQL: database '${env.database}' is available (created if missing).`);
  } finally {
    await conn.end();
  }
}
