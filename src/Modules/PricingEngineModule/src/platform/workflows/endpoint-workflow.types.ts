/**
 * Types for the Nest endpoint-workflow runtime (parity with C# ModuleEndpointWorkflowMiddleware /
 * WorkflowExecutor: parallel, foreach, compensate + saga, repeat). Idempotency-Key replay lives in the middleware (see in-memory-idempotency-store).
 */

/** One row of `workflows/generated-endpoint-workflows.json`. */
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
  /** `default` (or empty) always matches; otherwise `step.statusCode == 200`, `response.ok == true`, … */
  condition?: string;
  /** Next step name, or `success` | `end` | `fail`. */
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
  /** Coordinator: names of child steps run concurrently (no URL needed). */
  parallel?: string[];
  /** `all` (default) | `any` | `failFast` (cancels siblings on first failure). */
  join?: string;
  /** Token / expression resolving to an array, e.g. `{{input.items}}`. */
  foreach?: string;
  /** Loop alias for `{{item.x}}` tokens (default `item`). */
  as?: string;
  /** Sibling HTTP step executed once per item (C# ItemStep). */
  step?: string;
  /** `sequential` (default) | `parallel` (chunks of 8). */
  mode?: string;
  /** Upper bound on items processed (capped at 100). */
  maxItems?: number | string;
  /** Step run (LIFO, without transitions) when the workflow later fails. */
  compensate?: string;
  /** Retry count with exponential backoff + jitter. */
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
  /** True when the YAML declared an `output:` projection (and the workflow is an endpoint workflow). */
  hasOutput: boolean;
  output?: unknown;
  /** Flat C#-style results: `{ "step.statusCode": 200, "step.response": {...} }`. */
  steps: Record<string, unknown>;
  /** Id of the saga tracked for this run (see SagaStateStore). */
  sagaId?: string;
  /** Compensation step names that were executed successfully, in execution (LIFO) order. */
  compensatedSteps?: string[];
}

export const ENDPOINT_WORKFLOW_DEFAULT_PATH = 'workflows/generated-endpoint-workflows.json';
