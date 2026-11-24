"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sharedInMemorySagaStore = exports.InMemorySagaStore = exports.SAGA_STATE_STORE = void 0;
exports.SAGA_STATE_STORE = Symbol('SAGA_STATE_STORE');
const MAX_RETAINED_SAGAS = 10_000;
class InMemorySagaStore {
    constructor() {
        this.sagas = new Map();
    }
    async start(sagaId, workflowName, correlationId) {
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
            if (oldest === undefined)
                break;
            this.sagas.delete(oldest);
        }
    }
    async markStepCompleted(sagaId, stepName) {
        this.sagas.get(sagaId)?.completedSteps.push(stepName);
    }
    async markCompensating(sagaId) {
        const saga = this.sagas.get(sagaId);
        if (saga)
            saga.status = 'Compensating';
    }
    async markStepCompensated(sagaId, stepName) {
        this.sagas.get(sagaId)?.compensatedSteps.push(stepName);
    }
    async complete(sagaId, status) {
        const saga = this.sagas.get(sagaId);
        if (!saga)
            return;
        saga.status = status;
        saga.completedAt = new Date();
    }
    async get(sagaId) {
        const saga = this.sagas.get(sagaId);
        return saga
            ? { ...saga, completedSteps: [...saga.completedSteps], compensatedSteps: [...saga.compensatedSteps] }
            : undefined;
    }
}
exports.InMemorySagaStore = InMemorySagaStore;
exports.sharedInMemorySagaStore = new InMemorySagaStore();
//# sourceMappingURL=in-memory-saga-store.js.map