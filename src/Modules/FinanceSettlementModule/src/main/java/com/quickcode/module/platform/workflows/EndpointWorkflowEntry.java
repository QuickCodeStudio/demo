package com.quickcode.module.platform.workflows;

/** One row of {@code workflows/generated-endpoint-workflows.json}. */
public record EndpointWorkflowEntry(
        String name,
        String moduleName,
        String endpointPath,
        String httpMethod,
        String description,
        String workflowContent,
        boolean isActive) {}
