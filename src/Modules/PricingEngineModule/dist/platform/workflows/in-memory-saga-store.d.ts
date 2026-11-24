export type SagaStatus = 'Running' | 'Completed' | 'Compensating' | 'Compensated' | 'Failed';
export interface SagaState {
    sagaId: string;
    workflowName: string;
    correlationId?: string;
    status: SagaStatus;
    completedSteps: string[];
    compensatedSteps: string[];
    startedAt: Date;
    completedAt?: Date;
}
export interface SagaStateStore {
    start(sagaId: string, workflowName: string, correlationId?: string): Promise<void>;
    markStepCompleted(sagaId: string, stepName: string): Promise<void>;
    markCompensating(sagaId: string): Promise<void>;
    markStepCompensated(sagaId: string, stepName: string): Promise<void>;
    complete(sagaId: string, status: SagaStatus): Promise<void>;
    get(sagaId: string): Promise<SagaState | undefined>;
}
export declare const SAGA_STATE_STORE: unique symbol;
export declare class InMemorySagaStore implements SagaStateStore {
    private readonly sagas;
    start(sagaId: string, workflowName: string, correlationId?: string): Promise<void>;
    markStepCompleted(sagaId: string, stepName: string): Promise<void>;
    markCompensating(sagaId: string): Promise<void>;
    markStepCompensated(sagaId: string, stepName: string): Promise<void>;
    complete(sagaId: string, status: SagaStatus): Promise<void>;
    get(sagaId: string): Promise<SagaState | undefined>;
}
export declare const sharedInMemorySagaStore: InMemorySagaStore;
