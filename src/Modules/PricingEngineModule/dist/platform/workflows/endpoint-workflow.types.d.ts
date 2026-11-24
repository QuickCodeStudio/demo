export interface EndpointWorkflowEntry {
    name: string;
    moduleName: string;
    endpointPath: string;
    httpMethod: string;
    description?: string;
    workflowContent: string;
    isActive: boolean;
}
export interface EndpointWorkflowMatch {
    entry: EndpointWorkflowEntry;
    pathParameters: Record<string, string>;
}
export interface WorkflowTransition {
    condition?: string;
    action?: string;
}
export interface WorkflowStep {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
    timeoutSeconds?: number;
    transitions?: WorkflowTransition[];
    condition?: string;
    parallel?: string[];
    join?: string;
    foreach?: string;
    as?: string;
    step?: string;
    mode?: string;
    maxItems?: number | string;
    compensate?: string;
    repeat?: number | string;
}
export interface WorkflowVariable {
    type?: string;
    value?: unknown;
}
export interface WorkflowDefinition {
    kind?: string;
    name?: string;
    version?: string;
    description?: string;
    variables?: Record<string, WorkflowVariable>;
    steps?: Record<string, WorkflowStep>;
    output?: unknown;
}
export interface EndpointWorkflowExecutionResult {
    success: boolean;
    hasOutput: boolean;
    output?: unknown;
    steps: Record<string, unknown>;
    sagaId?: string;
    compensatedSteps?: string[];
}
export declare const ENDPOINT_WORKFLOW_DEFAULT_PATH = "workflows/generated-endpoint-workflows.json";
