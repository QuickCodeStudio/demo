package com.quickcode.module.platform.workflows;

import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/** Process-local saga state store (C# {@code InMemorySagaStateStore} parity). */
public class InMemorySagaStateStore {
    private final ConcurrentMap<String, SagaStateRecord> items = new ConcurrentHashMap<>();

    public void start(SagaStateRecord record) {
        items.put(record.sagaId(), record);
    }

    public void markStepCompleted(String sagaId, String stepName) {
        SagaStateRecord record = items.get(sagaId);
        if (record != null) {
            synchronized (record.completedSteps()) {
                if (record.completedSteps().stream().noneMatch(s -> s.equalsIgnoreCase(stepName))) {
                    record.completedSteps().add(stepName);
                }
            }
            record.touch();
        }
    }

    public void markCompensating(String sagaId) {
        SagaStateRecord record = items.get(sagaId);
        if (record != null) {
            record.status(SagaStatus.Compensating);
            record.touch();
        }
    }

    public void markStepCompensated(String sagaId, String stepName) {
        SagaStateRecord record = items.get(sagaId);
        if (record != null) {
            synchronized (record.compensatedSteps()) {
                if (record.compensatedSteps().stream().noneMatch(s -> s.equalsIgnoreCase(stepName))) {
                    record.compensatedSteps().add(stepName);
                }
            }
            record.touch();
        }
    }

    public void complete(String sagaId, SagaStatus status, String error) {
        SagaStateRecord record = items.get(sagaId);
        if (record != null) {
            record.status(status);
            record.lastError(error);
            record.touch();
        }
    }

    public void complete(String sagaId, SagaStatus status) {
        complete(sagaId, status, null);
    }

    public Optional<SagaStateRecord> get(String sagaId) {
        return Optional.ofNullable(items.get(sagaId));
    }
}
