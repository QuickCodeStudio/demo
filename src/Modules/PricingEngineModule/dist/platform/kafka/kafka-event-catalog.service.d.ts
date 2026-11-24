export interface KafkaEventEntry {
    topicName: string;
    urlPath: string;
    httpMethod: string;
    isActive: boolean;
}
export declare class KafkaEventCatalogService {
    private readonly logger;
    private cache;
    private readonly ttlMs;
    findAsync(httpMethod: string, path?: string): Promise<KafkaEventEntry | null>;
    private getEntries;
    private loadEvents;
}
