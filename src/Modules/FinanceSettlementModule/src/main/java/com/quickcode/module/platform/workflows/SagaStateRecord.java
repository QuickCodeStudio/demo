package com.quickcode.module.platform.workflows;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/** C# {@code SagaStateRecord} parity (mutable, thread-safe lists). */
public final class SagaStateRecord {
    private final String sagaId;
    private final String workflowName;
    private final String kind;
    private final String correlationId;
    private final List<String> completedSteps = Collections.synchronizedList(new ArrayList<>());
    private final List<String> compensatedSteps = Collections.synchronizedList(new ArrayList<>());
    private final Instant createdAt = Instant.now();
    private volatile SagaStatus status = SagaStatus.Running;
    private volatile String lastError;
    private volatile Instant updatedAt = Instant.now();

    public SagaStateRecord(String sagaId, String workflowName, String kind, String correlationId) {
        this.sagaId = sagaId;
        this.workflowName = workflowName;
        this.kind = kind;
        this.correlationId = correlationId;
    }

    public String sagaId() {
        return sagaId;
    }

    public String workflowName() {
        return workflowName;
    }

    public String kind() {
        return kind;
    }

    public String correlationId() {
        return correlationId;
    }

    public SagaStatus status() {
        return status;
    }

    public void status(SagaStatus value) {
        this.status = value;
    }

    public List<String> completedSteps() {
        return completedSteps;
    }

    public List<String> compensatedSteps() {
        return compensatedSteps;
    }

    public String lastError() {
        return lastError;
    }

    public void lastError(String value) {
        this.lastError = value;
    }

    public Instant createdAt() {
        return createdAt;
    }

    public Instant updatedAt() {
        return updatedAt;
    }

    public void touch() {
        this.updatedAt = Instant.now();
    }
}
