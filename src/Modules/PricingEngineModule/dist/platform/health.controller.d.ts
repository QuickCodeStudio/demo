import { DataSource } from 'typeorm';
export declare class HealthController {
    private readonly dataSource;
    constructor(dataSource: DataSource);
    healthCheck(): Promise<Record<string, unknown>>;
}
