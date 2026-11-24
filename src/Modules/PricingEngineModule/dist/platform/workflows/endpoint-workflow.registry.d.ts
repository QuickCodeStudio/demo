import { EndpointWorkflowEntry, EndpointWorkflowMatch } from './endpoint-workflow.types';
export declare function normalizeWorkflowPath(path: string): string;
export declare class EndpointWorkflowRegistry {
    private readonly logger;
    private byMethod;
    private count;
    constructor();
    get size(): number;
    loadFromFile(filePath?: string): void;
    register(entries: EndpointWorkflowEntry[]): void;
    find(httpMethod: string, path: string | undefined | null): EndpointWorkflowMatch | null;
}
