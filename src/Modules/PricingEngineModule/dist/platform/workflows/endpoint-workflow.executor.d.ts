import { EndpointWorkflowEntry, EndpointWorkflowExecutionResult } from './endpoint-workflow.types';
import { SagaStateStore } from './in-memory-saga-store';
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
export declare class EndpointWorkflowExecutor {
    private readonly logger;
    private readonly sagaStore;
    fetchImpl: FetchLike;
    constructor(sagaStore?: SagaStateStore);
    execute(entry: EndpointWorkflowEntry, input: Record<string, unknown>, correlationId?: string): Promise<EndpointWorkflowExecutionResult>;
}
export {};
