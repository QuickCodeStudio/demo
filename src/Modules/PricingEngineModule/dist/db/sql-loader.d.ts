import { DataSource } from 'typeorm';
export declare function loadSql(className: string, kind: 'Query' | 'Command' | 'Crud', scriptName: string): string;
export declare function bindNamedParamsMap(sql: string, named: Record<string, unknown>, dbType?: string): {
    text: string;
    params: unknown[];
};
export declare function bindNamedParams(sql: string, values: unknown[], dbType?: string): {
    text: string;
    params: unknown[];
};
export declare function executeNamedSqlScript(dataSource: DataSource, className: string, kind: 'Query' | 'Command' | 'Crud', scriptName: string, named?: Record<string, unknown>): Promise<unknown>;
export declare function executeSqlScript(dataSource: DataSource, className: string, kind: 'Query' | 'Command' | 'Crud', scriptName: string, values?: unknown[]): Promise<unknown>;
export declare function firstRow(result: unknown): Record<string, unknown> | null;
export declare function asRows(result: unknown): Record<string, unknown>[];
export declare function affectedCount(result: unknown): number;
export declare function scalarNumber(result: unknown): number;
