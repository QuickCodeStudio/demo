package com.quickcode.module.platform.workflows;

/** C# {@code SagaStatus} parity. */
public enum SagaStatus {
    Running,
    Completed,
    Compensating,
    Compensated,
    Failed
}
