import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import { Logger } from '@nestjs/common';
import { Client as PgClient } from 'pg';
import * as sql from 'mssql';
import * as mysql from 'mysql2/promise';
import {
  ensureDatabaseExists,
  normalizeDbType,
  readDbConnectionEnv,
  scriptSuffix,
  type QuickCodeDbType,
} from './db-config';

const HISTORY_TABLE = '__QuickCodeSqlMigrations';

function shouldRunMigrations(): boolean {
  const flag = (process.env.RUN_MIGRATION ?? 'yes').trim().toLowerCase();
  return flag !== 'no' && flag !== 'false' && flag !== '0';
}

function resolveMigrationsDir(): string {
  const fromEnv = process.env.QUICKCODE_MIGRATIONS_DIR;
  if (fromEnv) return fromEnv;
  // dist/db/*.js → ../../migrations (module root)
  return path.resolve(__dirname, '..', '..', 'migrations');
}

/** SQL Server rejects UTF-8 BOM at the start of a batch. */
function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

async function listSqlScripts(dir: string, suffix: string): Promise<string[]> {
  const results: string[] = [];
  async function walk(current: string) {
    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'InitialData') continue;
        await walk(full);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(suffix.toLowerCase())) {
        results.push(full);
      }
    }
  }
  await walk(dir);
  return results.sort((a, b) => {
    const byName = path.basename(a).localeCompare(path.basename(b), undefined, { sensitivity: 'base' });
    return byName !== 0 ? byName : a.localeCompare(b);
  });
}

function splitCommands(sqlText: string, dbType: QuickCodeDbType): string[] {
  if (dbType !== 'mssql') return [sqlText];
  const commands: string[] = [];
  let current = '';
  for (const line of sqlText.split(/\r?\n/)) {
    if (line.trim().toUpperCase() === 'GO') {
      if (current.trim()) commands.push(current);
      current = '';
    } else {
      current += line + '\n';
    }
  }
  if (current.trim()) commands.push(current);
  return commands;
}

function createHistoryTableSql(dbType: QuickCodeDbType): string {
  switch (dbType) {
    case 'mssql':
      return `
IF OBJECT_ID(N'dbo.${HISTORY_TABLE}', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[${HISTORY_TABLE}] (
    [MigrationId] nvarchar(300) NOT NULL PRIMARY KEY,
    [ScriptHash] nvarchar(128) NOT NULL,
    [AppliedAtUtc] datetime2 NOT NULL
  );
END;`;
    case 'mysql':
      return `
CREATE TABLE IF NOT EXISTS \`${HISTORY_TABLE}\` (
  \`MigrationId\` varchar(300) NOT NULL PRIMARY KEY,
  \`ScriptHash\` varchar(128) NOT NULL,
  \`AppliedAtUtc\` datetime(6) NOT NULL
);`;
    default:
      return `
CREATE TABLE IF NOT EXISTS "${HISTORY_TABLE}" (
  "MigrationId" varchar(300) NOT NULL PRIMARY KEY,
  "ScriptHash" varchar(128) NOT NULL,
  "AppliedAtUtc" timestamp with time zone NOT NULL
);`;
  }
}

function selectAppliedSql(dbType: QuickCodeDbType): string {
  switch (dbType) {
    case 'mssql':
      return `SELECT [MigrationId] FROM [dbo].[${HISTORY_TABLE}];`;
    case 'mysql':
      return `SELECT \`MigrationId\` FROM \`${HISTORY_TABLE}\`;`;
    default:
      return `SELECT "MigrationId" FROM "${HISTORY_TABLE}";`;
  }
}

function insertHistorySql(dbType: QuickCodeDbType): string {
  switch (dbType) {
    case 'mssql':
      return `INSERT INTO [dbo].[${HISTORY_TABLE}] ([MigrationId], [ScriptHash], [AppliedAtUtc]) VALUES (@id, @hash, @at);`;
    case 'mysql':
      return `INSERT INTO \`${HISTORY_TABLE}\` (\`MigrationId\`, \`ScriptHash\`, \`AppliedAtUtc\`) VALUES (?, ?, ?);`;
    default:
      return `INSERT INTO "${HISTORY_TABLE}" ("MigrationId", "ScriptHash", "AppliedAtUtc") VALUES ($1, $2, $3);`;
  }
}

type DbExecutor = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
  close: () => Promise<void>;
};

async function openExecutor(dbType: QuickCodeDbType): Promise<DbExecutor> {
  const env = readDbConnectionEnv();
  if (dbType === 'postgresql') {
    const client = new PgClient({
      host: env.host,
      port: env.port,
      user: env.user,
      password: env.password,
      database: env.database,
    });
    await client.connect();
    return {
      query: async (text, params) => {
        const res = await client.query(text, params);
        return { rows: res.rows as Array<Record<string, unknown>> };
      },
      close: async () => client.end(),
    };
  }

  if (dbType === 'mssql') {
    const pool = await sql.connect({
      server: env.host,
      port: env.port,
      user: env.user,
      password: env.password,
      database: env.database,
      options: { encrypt: false, trustServerCertificate: true },
    });
    return {
      query: async (text, params) => {
        const req = pool.request();
        if (params && params.length >= 3) {
          req.input('id', sql.NVarChar, params[0] as string);
          req.input('hash', sql.NVarChar, params[1] as string);
          req.input('at', sql.DateTime2, params[2] as Date);
        }
        const res = await req.query(text);
        return { rows: (res.recordset ?? []) as Array<Record<string, unknown>> };
      },
      close: async () => pool.close(),
    };
  }

  const conn = await mysql.createConnection({
    host: env.host,
    port: env.port,
    user: env.user,
    password: env.password,
    database: env.database,
  });
  return {
    query: async (text, params) => {
      const [rows] = await conn.query(text, params);
      return { rows: (Array.isArray(rows) ? rows : []) as Array<Record<string, unknown>> };
    },
    close: async () => conn.end(),
  };
}

/**
 * Nest equivalent of C# QuickCodeSqlMigrationRunner — applies *.{postgresql|mssql|mysql}.sql
 * under migrations/ for the module's DatabaseType (same as .NET).
 */
export async function runQuickCodeSqlMigrations(): Promise<void> {
  const logger = new Logger('QuickCodeSqlMigrationRunner');
  if (!shouldRunMigrations()) {
    logger.log('RUN_MIGRATION disabled — skipping SQL migrations.');
    return;
  }

  const raw = (process.env.DB_TYPE ?? 'postgresql').toLowerCase();
  if (raw === 'inmemory') return;

  const dbType = normalizeDbType(raw);
  await ensureDatabaseExists();

  const migrationsDir = resolveMigrationsDir();
  const suffix = scriptSuffix(dbType);
  const scripts = await listSqlScripts(migrationsDir, suffix);
  if (scripts.length === 0) {
    logger.log(`No QuickCode SQL migration scripts found in ${migrationsDir} (suffix ${suffix})`);
    return;
  }

  const executor = await openExecutor(dbType);
  try {
    await executor.query(createHistoryTableSql(dbType));
    const appliedRes = await executor.query(selectAppliedSql(dbType));
    const applied = new Set(
      appliedRes.rows.map((r) => String(r.MigrationId ?? r.migrationid ?? Object.values(r)[0] ?? '')),
    );

    for (const script of scripts) {
      const migrationId = path.basename(script);
      if (applied.has(migrationId)) continue;

      const sqlText = stripBom(await fs.readFile(script, 'utf8'));
      if (!sqlText.trim()) continue;

      logger.log(`Applying QuickCode SQL migration ${migrationId}`);
      try {
        for (const batch of splitCommands(sqlText, dbType)) {
          await executor.query(batch);
        }
        const hash = createHash('sha256').update(sqlText, 'utf8').digest('hex').toUpperCase();
        await executor.query(insertHistorySql(dbType), [migrationId, hash, new Date()]);
      } catch (err) {
        logger.error(`Migration failed: ${migrationId}`, err instanceof Error ? err.stack : String(err));
        throw err;
      }
    }
  } finally {
    await executor.close();
  }
}
