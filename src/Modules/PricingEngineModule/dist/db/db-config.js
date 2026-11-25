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
exports.normalizeDbType = normalizeDbType;
exports.toTypeOrmDriver = toTypeOrmDriver;
exports.scriptSuffix = scriptSuffix;
exports.defaultPort = defaultPort;
exports.defaultUser = defaultUser;
exports.defaultPassword = defaultPassword;
exports.applyConnectionStringEnvFallback = applyConnectionStringEnvFallback;
exports.readDbConnectionEnv = readDbConnectionEnv;
exports.ensureDatabaseExists = ensureDatabaseExists;
const common_1 = require("@nestjs/common");
const pg_1 = require("pg");
const sql = __importStar(require("mssql"));
const mysql = __importStar(require("mysql2/promise"));
function normalizeDbType(raw) {
    const t = (raw ?? process.env.DB_TYPE ?? 'postgresql').trim().toLowerCase();
    if (t === 'postgres' || t === 'postgresql')
        return 'postgresql';
    if (t === 'mysql')
        return 'mysql';
    if (t === 'mssql' || t === 'sqlserver' || t === 'sql server')
        return 'mssql';
    return 'postgresql';
}
function toTypeOrmDriver(dbType) {
    return dbType === 'postgresql' ? 'postgres' : dbType;
}
function scriptSuffix(dbType) {
    return `.${dbType}.sql`;
}
function defaultPort(dbType) {
    switch (dbType) {
        case 'mssql':
            return 1433;
        case 'mysql':
            return 3306;
        default:
            return 5432;
    }
}
function defaultUser(dbType) {
    switch (dbType) {
        case 'mssql':
            return 'sa';
        default:
            return 'docker';
    }
}
function defaultPassword(dbType) {
    switch (dbType) {
        case 'mssql':
            return 'Pass@word';
        default:
            return 'dockerf';
    }
}
function applyConnectionStringEnvFallback() {
    if ((process.env.DB_HOST ?? '').trim())
        return;
    const raw = process.env.READ_CONNECTION_STRING?.trim() ||
        process.env.WRITE_CONNECTION_STRING?.trim();
    if (!raw)
        return;
    const map = parseAdoStyleConnectionString(raw);
    const host = map['data source'] ||
        map['server'] ||
        map['host'] ||
        map['addr'] ||
        map['address'];
    if (!host)
        return;
    const [hostOnly, portFromHost] = splitHostPort(host);
    process.env.DB_HOST = hostOnly;
    const catalog = map['initial catalog'] || map['database'] || map['db'];
    if (catalog)
        process.env.DB_DATABASE = catalog;
    const user = map['user id'] || map['uid'] || map['username'] || map['user'];
    if (user)
        process.env.DB_USERNAME = user;
    const password = map['password'] || map['pwd'];
    if (password)
        process.env.DB_PASSWORD = password;
    const port = map['port'] ||
        portFromHost ||
        (looksLikeMssql(map) ? '1433' : undefined);
    if (port)
        process.env.DB_PORT = port;
    if (!(process.env.DB_TYPE ?? '').trim()) {
        if (looksLikeMssql(map))
            process.env.DB_TYPE = 'mssql';
        else if (map['uid'] || map['pwd'] || map['server'])
            process.env.DB_TYPE = 'mysql';
        else if (map['host'] || map['username'])
            process.env.DB_TYPE = 'postgresql';
    }
}
function looksLikeMssql(map) {
    return !!(map['data source'] || map['initial catalog'] || map['user id']);
}
function parseAdoStyleConnectionString(raw) {
    const map = {};
    for (const part of raw.split(';')) {
        const idx = part.indexOf('=');
        if (idx <= 0)
            continue;
        const key = part.slice(0, idx).trim().toLowerCase();
        const value = part.slice(idx + 1).trim();
        if (key)
            map[key] = value;
    }
    return map;
}
function splitHostPort(host) {
    let h = host.trim();
    if (h.toLowerCase().startsWith('tcp:'))
        h = h.slice(4);
    const comma = h.lastIndexOf(',');
    if (comma > 0) {
        const maybePort = h.slice(comma + 1).trim();
        if (/^\d+$/.test(maybePort))
            return [h.slice(0, comma).trim(), maybePort];
    }
    const colon = h.lastIndexOf(':');
    if (colon > 0 && h.indexOf(':') === colon) {
        const maybePort = h.slice(colon + 1).trim();
        if (/^\d+$/.test(maybePort))
            return [h.slice(0, colon).trim(), maybePort];
    }
    return [h, undefined];
}
function readDbConnectionEnv() {
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
async function ensureDatabaseExists() {
    const logger = new common_1.Logger('QuickCodeDatabaseProvisioner');
    const env = readDbConnectionEnv();
    if (!env.database?.trim())
        return;
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
async function ensurePostgres(env, logger) {
    const adminCandidates = [
        process.env.DB_ADMIN_DATABASE,
        'postgres',
        env.user,
        'template1',
    ].filter((x) => !!x && x !== env.database);
    let lastError;
    for (const adminDb of adminCandidates) {
        const client = new pg_1.Client({
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
            }
            catch (err) {
                if (err?.code === '42P04') {
                    logger.log(`PostgreSQL: database '${env.database}' already exists.`);
                }
                else {
                    throw err;
                }
            }
            await client.end();
            return;
        }
        catch (err) {
            lastError = err;
            try {
                await client.end();
            }
            catch {
            }
        }
    }
    throw lastError instanceof Error
        ? lastError
        : new Error(`PostgreSQL: could not ensure database '${env.database}'`);
}
async function ensureMssql(env, logger) {
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
            .query(`IF DB_ID(N'${nameLiteral}') IS NULL CREATE DATABASE [${nameBracket}];`);
        logger.log(`SQL Server: database '${env.database}' is available (created if missing).`);
    }
    finally {
        await pool.close();
    }
}
async function ensureMysql(env, logger) {
    const conn = await mysql.createConnection({
        host: env.host,
        port: env.port,
        user: env.user,
        password: env.password,
    });
    try {
        const safe = env.database.replace(/`/g, '``');
        await conn.query(`CREATE DATABASE IF NOT EXISTS \`${safe}\``);
        logger.log(`MySQL: database '${env.database}' is available (created if missing).`);
    }
    finally {
        await conn.end();
    }
}
//# sourceMappingURL=db-config.js.map