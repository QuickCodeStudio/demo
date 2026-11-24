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

export function readDbConnectionEnv(): DbConnectionEnv {
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
