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
exports.runQuickCodeSqlMigrations = runQuickCodeSqlMigrations;
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const path = __importStar(require("path"));
const common_1 = require("@nestjs/common");
const pg_1 = require("pg");
const sql = __importStar(require("mssql"));
const mysql = __importStar(require("mysql2/promise"));
const db_config_1 = require("./db-config");
const HISTORY_TABLE = '__QuickCodeSqlMigrations';
function shouldRunMigrations() {
    const flag = (process.env.RUN_MIGRATION ?? 'yes').trim().toLowerCase();
    return flag !== 'no' && flag !== 'false' && flag !== '0';
}
function resolveMigrationsDir() {
    const fromEnv = process.env.QUICKCODE_MIGRATIONS_DIR;
    if (fromEnv)
        return fromEnv;
    return path.resolve(__dirname, '..', '..', 'migrations');
}
function stripBom(text) {
    return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}
async function listSqlScripts(dir, suffix) {
    const results = [];
    async function walk(current) {
        let entries;
        try {
            entries = await fs_1.promises.readdir(current, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const entry of entries) {
            const full = path.join(current, entry.name);
            if (entry.isDirectory()) {
                if (entry.name === 'InitialData')
                    continue;
                await walk(full);
            }
            else if (entry.isFile() && entry.name.toLowerCase().endsWith(suffix.toLowerCase())) {
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
function splitCommands(sqlText, dbType) {
    if (dbType !== 'mssql')
        return [sqlText];
    const commands = [];
    let current = '';
    for (const line of sqlText.split(/\r?\n/)) {
        if (line.trim().toUpperCase() === 'GO') {
            if (current.trim())
                commands.push(current);
            current = '';
        }
        else {
            current += line + '\n';
        }
    }
    if (current.trim())
        commands.push(current);
    return commands;
}
function createHistoryTableSql(dbType) {
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
function selectAppliedSql(dbType) {
    switch (dbType) {
        case 'mssql':
            return `SELECT [MigrationId] FROM [dbo].[${HISTORY_TABLE}];`;
        case 'mysql':
            return `SELECT \`MigrationId\` FROM \`${HISTORY_TABLE}\`;`;
        default:
            return `SELECT "MigrationId" FROM "${HISTORY_TABLE}";`;
    }
}
function insertHistorySql(dbType) {
    switch (dbType) {
        case 'mssql':
            return `INSERT INTO [dbo].[${HISTORY_TABLE}] ([MigrationId], [ScriptHash], [AppliedAtUtc]) VALUES (@id, @hash, @at);`;
        case 'mysql':
            return `INSERT INTO \`${HISTORY_TABLE}\` (\`MigrationId\`, \`ScriptHash\`, \`AppliedAtUtc\`) VALUES (?, ?, ?);`;
        default:
            return `INSERT INTO "${HISTORY_TABLE}" ("MigrationId", "ScriptHash", "AppliedAtUtc") VALUES ($1, $2, $3);`;
    }
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
                if (params && params.length >= 3) {
                    req.input('id', sql.NVarChar, params[0]);
                    req.input('hash', sql.NVarChar, params[1]);
                    req.input('at', sql.DateTime2, params[2]);
                }
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
async function runQuickCodeSqlMigrations() {
    const logger = new common_1.Logger('QuickCodeSqlMigrationRunner');
    if (!shouldRunMigrations()) {
        logger.log('RUN_MIGRATION disabled — skipping SQL migrations.');
        return;
    }
    const raw = (process.env.DB_TYPE ?? 'postgresql').toLowerCase();
    if (raw === 'inmemory')
        return;
    const dbType = (0, db_config_1.normalizeDbType)(raw);
    await (0, db_config_1.ensureDatabaseExists)();
    const migrationsDir = resolveMigrationsDir();
    const suffix = (0, db_config_1.scriptSuffix)(dbType);
    const scripts = await listSqlScripts(migrationsDir, suffix);
    if (scripts.length === 0) {
        logger.log(`No QuickCode SQL migration scripts found in ${migrationsDir} (suffix ${suffix})`);
        return;
    }
    const executor = await openExecutor(dbType);
    try {
        await executor.query(createHistoryTableSql(dbType));
        const appliedRes = await executor.query(selectAppliedSql(dbType));
        const applied = new Set(appliedRes.rows.map((r) => String(r.MigrationId ?? r.migrationid ?? Object.values(r)[0] ?? '')));
        for (const script of scripts) {
            const migrationId = path.basename(script);
            if (applied.has(migrationId))
                continue;
            const sqlText = stripBom(await fs_1.promises.readFile(script, 'utf8'));
            if (!sqlText.trim())
                continue;
            logger.log(`Applying QuickCode SQL migration ${migrationId}`);
            try {
                for (const batch of splitCommands(sqlText, dbType)) {
                    await executor.query(batch);
                }
                const hash = (0, crypto_1.createHash)('sha256').update(sqlText, 'utf8').digest('hex').toUpperCase();
                await executor.query(insertHistorySql(dbType), [migrationId, hash, new Date()]);
            }
            catch (err) {
                logger.error(`Migration failed: ${migrationId}`, err instanceof Error ? err.stack : String(err));
                throw err;
            }
        }
    }
    finally {
        await executor.close();
    }
}
//# sourceMappingURL=sql-migration.runner.js.map