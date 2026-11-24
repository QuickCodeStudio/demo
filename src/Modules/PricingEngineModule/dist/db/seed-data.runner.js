"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runQuickCodeSeedData = runQuickCodeSeedData;
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const path = __importStar(require("path"));
const common_1 = require("@nestjs/common");
const pg_1 = require("pg");
const sql = __importStar(require("mssql"));
const mysql = __importStar(require("mysql2/promise"));
const db_config_1 = require("./db-config");
const HISTORY_TABLE = '__QuickCodeSeedHistory';
function shouldRunMigrations() {
    const flag = (process.env.RUN_MIGRATION ?? 'yes').trim().toLowerCase();
    return flag !== 'no' && flag !== 'false' && flag !== '0';
}
function resolveInitialDataDir() {
    const fromEnv = process.env.QUICKCODE_INITIAL_DATA_DIR;
    if (fromEnv)
        return fromEnv;
    return path.resolve(__dirname, '..', '..', 'migrations', 'InitialData');
}
function quoteIdent(name, dbType) {
    if (dbType === 'mssql')
        return `[${name.replace(/]/g, ']]')}]`;
    if (dbType === 'mysql')
        return `\`${name.replace(/`/g, '``')}\``;
    return `"${name.replace(/"/g, '""')}"`;
}
async function listSeedFiles(dir) {
    let entries;
    try {
        entries = await fs_1.promises.readdir(dir, { withFileTypes: true });
    }
    catch {
        return [];
    }
    return entries
        .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.json'))
        .map((e) => path.join(dir, e.name))
        .sort((a, b) => path.basename(a).localeCompare(path.basename(b), undefined, { sensitivity: 'base' }));
}
function normalizeRow(row) {
    const next = {};
    for (const [key, value] of Object.entries(row)) {
        if (value === undefined)
            continue;
        next[key] = value;
    }
    return next;
}
function stripBom(text) {
    return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}
function buildRowKey(row, columns) {
    return columns.map((c) => `${c}=${JSON.stringify(row[c] ?? null)}`).join('|');
}
async function openExecutor(dbType) {
    const env = (0, db_config_1.readDbConnectionEnv)();
    if (dbType === 'postgresql') {
        const client = new pg_1.Client({
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
                return { rows: res.rows };
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
                (params ?? []).forEach((p, i) => {
                    req.input(`p${i}`, p);
                });
                const res = await req.query(text);
                return { rows: (res.recordset ?? []) };
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
            return { rows: (Array.isArray(rows) ? rows : []) };
        },
        close: async () => conn.end(),
    };
}
function historyCreateSql(dbType) {
    switch (dbType) {
        case 'mssql':
            return `
IF OBJECT_ID(N'dbo.${HISTORY_TABLE}', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[${HISTORY_TABLE}] (
    [SeedFile] nvarchar(300) NOT NULL,
    [ScriptHash] nvarchar(128) NOT NULL,
    [AppliedAtUtc] datetime2 NOT NULL,
    [InsertedRows] int NOT NULL,
    [ElapsedMs] bigint NOT NULL DEFAULT 0,
    PRIMARY KEY ([SeedFile], [ScriptHash])
  );
END;`;
        case 'mysql':
            return `
CREATE TABLE IF NOT EXISTS \`${HISTORY_TABLE}\` (
  \`SeedFile\` varchar(300) NOT NULL,
  \`ScriptHash\` varchar(128) NOT NULL,
  \`AppliedAtUtc\` datetime(6) NOT NULL,
  \`InsertedRows\` int NOT NULL,
  \`ElapsedMs\` bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (\`SeedFile\`, \`ScriptHash\`)
);`;
        default:
            return `
CREATE TABLE IF NOT EXISTS "${HISTORY_TABLE}" (
  "SeedFile" varchar(300) NOT NULL,
  "ScriptHash" varchar(128) NOT NULL,
  "AppliedAtUtc" timestamp with time zone NOT NULL,
  "InsertedRows" int NOT NULL,
  "ElapsedMs" bigint NOT NULL DEFAULT 0,
  PRIMARY KEY ("SeedFile", "ScriptHash")
);`;
    }
}
function placeholders(count, dbType) {
    if (dbType === 'postgresql')
        return Array.from({ length: count }, (_, i) => `$${i + 1}`).join(', ');
    if (dbType === 'mssql')
        return Array.from({ length: count }, (_, i) => `@p${i}`).join(', ');
    return Array.from({ length: count }, () => '?').join(', ');
}
async function runQuickCodeSeedData() {
    const logger = new common_1.Logger('QuickCodeSeedDataRunner');
    if (!shouldRunMigrations()) {
        logger.log('RUN_MIGRATION disabled — skipping seed data.');
        return;
    }
    const raw = (process.env.DB_TYPE ?? 'postgresql').toLowerCase();
    if (raw === 'inmemory')
        return;
    const dbType = (0, db_config_1.normalizeDbType)(raw);
    await (0, db_config_1.ensureDatabaseExists)();
    const seedDir = resolveInitialDataDir();
    const files = await listSeedFiles(seedDir);
    if (files.length === 0) {
        logger.log(`No QuickCode seed data files found in ${seedDir}`);
        return;
    }
    const executor = await openExecutor(dbType);
    try {
        await executor.query(historyCreateSql(dbType));
        for (const file of files) {
            const started = Date.now();
            const content = stripBom(await fs_1.promises.readFile(file, 'utf8'));
            const fileName = path.basename(file);
            const hash = (0, crypto_1.createHash)('sha256').update(content, 'utf8').digest('hex').toUpperCase();
            const historyCheckSql = dbType === 'mssql'
                ? `SELECT 1 AS x FROM [dbo].[${HISTORY_TABLE}] WHERE [SeedFile] = @p0 AND [ScriptHash] = @p1`
                : dbType === 'mysql'
                    ? `SELECT 1 AS x FROM \`${HISTORY_TABLE}\` WHERE \`SeedFile\` = ? AND \`ScriptHash\` = ? LIMIT 1`
                    : `SELECT 1 FROM "${HISTORY_TABLE}" WHERE "SeedFile" = $1 AND "ScriptHash" = $2 LIMIT 1`;
            const history = await executor.query(historyCheckSql, [fileName, hash]);
            if (history.rows.length > 0) {
                logger.log(`Skipped QuickCode seed file ${fileName}; already applied.`);
                continue;
            }
            let insertedRows = 0;
            try {
                const root = JSON.parse(content);
                for (const [tableName, rows] of Object.entries(root ?? {})) {
                    if (!Array.isArray(rows) || rows.length === 0)
                        continue;
                    const sample = normalizeRow(rows[0] ?? {});
                    const uniqueColumns = Object.keys(sample);
                    if (uniqueColumns.length === 0)
                        continue;
                    const existing = new Set();
                    const selectCols = uniqueColumns.map((c) => quoteIdent(c, dbType)).join(', ');
                    const existingRes = await executor.query(`SELECT ${selectCols} FROM ${quoteIdent(tableName, dbType)}`);
                    for (const er of existingRes.rows) {
                        existing.add(buildRowKey(er, uniqueColumns));
                    }
                    for (const rawRow of rows) {
                        const row = normalizeRow(rawRow);
                        if (Object.keys(row).length === 0)
                            continue;
                        const key = buildRowKey(row, uniqueColumns);
                        if (existing.has(key))
                            continue;
                        const cols = Object.keys(row);
                        const values = cols.map((c) => row[c]);
                        await executor.query(`INSERT INTO ${quoteIdent(tableName, dbType)} (${cols.map((c) => quoteIdent(c, dbType)).join(', ')}) VALUES (${placeholders(cols.length, dbType)})`, values);
                        existing.add(key);
                        insertedRows++;
                    }
                }
                const insertHistorySql = dbType === 'mssql'
                    ? `INSERT INTO [dbo].[${HISTORY_TABLE}] ([SeedFile], [ScriptHash], [AppliedAtUtc], [InsertedRows], [ElapsedMs]) VALUES (@p0, @p1, @p2, @p3, @p4)`
                    : dbType === 'mysql'
                        ? `INSERT INTO \`${HISTORY_TABLE}\` (\`SeedFile\`, \`ScriptHash\`, \`AppliedAtUtc\`, \`InsertedRows\`, \`ElapsedMs\`) VALUES (?, ?, ?, ?, ?)`
                        : `INSERT INTO "${HISTORY_TABLE}" ("SeedFile", "ScriptHash", "AppliedAtUtc", "InsertedRows", "ElapsedMs") VALUES ($1, $2, $3, $4, $5)`;
                await executor.query(insertHistorySql, [
                    fileName,
                    hash,
                    new Date(),
                    insertedRows,
                    Date.now() - started,
                ]);
                logger.log(`Applied QuickCode seed file ${fileName} (${insertedRows} rows).`);
            }
            catch (err) {
                logger.error(`Seed file failed: ${fileName}`, err instanceof Error ? err.stack : String(err));
            }
        }
    }
    finally {
        await executor.close();
    }
}
//# sourceMappingURL=seed-data.runner.js.map