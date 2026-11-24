export type QuickCodeDbType = 'postgresql' | 'mssql' | 'mysql';
export declare function normalizeDbType(raw?: string): QuickCodeDbType;
export declare function toTypeOrmDriver(dbType: QuickCodeDbType): 'postgres' | 'mssql' | 'mysql';
export declare function scriptSuffix(dbType: QuickCodeDbType): string;
export declare function defaultPort(dbType: QuickCodeDbType): number;
export declare function defaultUser(dbType: QuickCodeDbType): string;
export declare function defaultPassword(dbType: QuickCodeDbType): string;
export interface DbConnectionEnv {
    dbType: QuickCodeDbType;
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
}
export declare function readDbConnectionEnv(): DbConnectionEnv;
export declare function ensureDatabaseExists(): Promise<void>;
