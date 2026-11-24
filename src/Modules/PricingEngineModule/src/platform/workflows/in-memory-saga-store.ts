/**
 * Nest parity of C# InMemorySagaStateStore: tracks saga progress for endpoint workflows that use `compensate:`.
 * Process-local only; swap in a durable implementation via the SAGA_STATE_STORE injection token.
 */

export type SagaStatus = 'Running' | 'Completed' | 'Compensating' | 'Compensated' | 'Failed';

export interface SagaState {
  sagaId: string;
  workflowName: string;
  correlationId?: string;
  status: SagaStatus;
  /** Steps that finished successfully and registered a compensation (execution order). */
  completedSteps: string[];
  /** Steps whose compensation has been executed (compensation order, i.e. LIFO). */
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

/** Nest injection token (optional) for overriding the saga store used by EndpointWorkflowExecutor. */
export const SAGA_STATE_STORE = Symbol('SAGA_STATE_STORE');

/** Upper bound on retained sagas; oldest entries are evicted first so long-running processes do not leak. */
const MAX_RETAINED_SAGAS = 10_000;

export class InMemorySagaStore implements SagaStateStore {
  private readonly sagas = new Map<string, SagaState>();

  async start(sagaId: string, workflowName: string, correlationId?: string): Promise<void> {
    this.sagas.set(sagaId, {
      sagaId,
      workflowName,
      correlationId,
      status: 'Running',
      completedSteps: [],
      compensatedSteps: [],
      startedAt: new Date(),
    });
    while (this.sagas.size > MAX_RETAINED_SAGAS) {
      const oldest = this.sagas.keys().next().value;
      if (oldest === undefined) break;
      this.sagas.delete(oldest);
    }
  }

  async markStepCompleted(sagaId: string, stepName: string): Promise<void> {
    this.sagas.get(sagaId)?.completedSteps.push(stepName);
  }

  async markCompensating(sagaId: string): Promise<void> {
    const saga = this.sagas.get(sagaId);
    if (saga) saga.status = 'Compensating';
  }

  async markStepCompensated(sagaId: string, stepName: string): Promise<void> {
    this.sagas.get(sagaId)?.compensatedSteps.push(stepName);
  }

  async complete(sagaId: string, status: SagaStatus): Promise<void> {
    const saga = this.sagas.get(sagaId);
    if (!saga) return;
    saga.status = status;
    saga.completedAt = new Date();
  }

  /** Returns a snapshot copy so callers cannot mutate store state. */
  async get(sagaId: string): Promise<SagaState | undefined> {
    const saga = this.sagas.get(sagaId);
    return saga
      ? { ...saga, completedSteps: [...saga.completedSteps], compensatedSteps: [...saga.compensatedSteps] }
      : undefined;
  }
}

/** Process-wide default store (C# singleton registration). */
export const sharedInMemorySagaStore = new InMemorySagaStore();
