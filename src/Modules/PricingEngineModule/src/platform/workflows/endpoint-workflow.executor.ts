import { randomUUID } from 'crypto';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { parse as parseYaml } from 'yaml';
import { createGatewayServiceToken } from '../gateway-jwt.middleware';
import {
  EndpointWorkflowEntry,
  EndpointWorkflowExecutionResult,
  WorkflowDefinition,
  WorkflowStep,
} from './endpoint-workflow.types';
import {
  SAGA_STATE_STORE,
  SagaStateStore,
  SagaStatus,
  sharedInMemorySagaStore,
} from './in-memory-saga-store';

const MAX_STEP_VISITS = 100;
const MAX_PARALLEL_BRANCHES = 8;
const MAX_FOREACH_ITEMS = 100;
const DEFAULT_TIMEOUT_SECONDS = 30;
const DEFAULT_RETRY_BASE_DELAY_MS = 1000;
const DEFAULT_MAX_RETRY_DELAY_MS = 30000;
const TOKEN_REGEX = /\{\{(.*?)\}\}/g;

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** Per-invocation options for `executeStep` (C# followTransitions / cancellation / item scope). */
interface StepOptions {
  /** When false the step never follows its transitions (parallel children, foreach items, compensations). */
  followTransitions?: boolean;
  /** Cancels in-flight HTTP calls / retry sleeps (parallel failFast). */
  signal?: AbortSignal;
  /** Key prefix for stored results (`<resultKey>.statusCode`); defaults to the step name. */
  resultKey?: string;
  /** Loop alias → item, visible to `{{alias.x}}` tokens only while the HTTP request is built. */
  itemScope?: { alias: string; item: unknown };
}

interface RegisteredCompensation {
  stepName: string;
  compensateName: string;
}

/**
 * Nest parity of C# WorkflowExecutor for `kind: endpoint`:
 * HTTP steps, transitions, `{{tokens}}`, output projection, plus
 * parallel / foreach / compensate (saga) / repeat.
 */
@Injectable()
export class EndpointWorkflowExecutor {
  private readonly logger = new Logger(EndpointWorkflowExecutor.name);
  private readonly sagaStore: SagaStateStore;

  /** Overridable in tests. */
  fetchImpl: FetchLike = (input, init) => fetch(input, init);

  constructor(@Optional() @Inject(SAGA_STATE_STORE) sagaStore?: SagaStateStore) {
    this.sagaStore = sagaStore ?? sharedInMemorySagaStore;
  }

  async execute(
    entry: EndpointWorkflowEntry,
    input: Record<string, unknown>,
    correlationId?: string,
  ): Promise<EndpointWorkflowExecutionResult> {
    const workflow = (parseYaml(entry.workflowContent) ?? {}) as WorkflowDefinition;
    const run = new WorkflowRun(workflow, input, correlationId, this.fetchImpl, this.logger, this.sagaStore);
    return run.execute();
  }
}

class WorkflowRun {
  private readonly results = new Map<string, unknown>();
  private readonly variables = new Map<string, unknown>();
  private readonly itemScopes = new Map<string, unknown>();
  private readonly compensations: RegisteredCompensation[] = [];
  private readonly compensatedSteps: string[] = [];
  private compensationsRunning = false;
  private compensationsExecuted = false;
  private readonly sagaId = randomUUID();

  constructor(
    private readonly workflow: WorkflowDefinition,
    private readonly input: Record<string, unknown>,
    private readonly correlationId: string | undefined,
    private readonly fetchImpl: FetchLike,
    private readonly logger: Logger,
    private readonly sagaStore: SagaStateStore,
  ) {}

  async execute(): Promise<EndpointWorkflowExecutionResult> {
    this.logger.log(`Starting workflow: ${this.workflow.name ?? '(unnamed)'} CorrelationId=${this.correlationId ?? ''}`);
    this.initializeVariables();
    await this.sagaStore.start(this.sagaId, this.workflow.name ?? '', this.correlationId);

    const steps = this.workflow.steps ?? {};
    const names = Object.keys(steps);
    let success = true;
    try {
      if (names.length === 0) {
        this.logger.warn(`Workflow ${this.workflow.name ?? ''} has no steps`);
      } else {
        success = await this.executeStep(names[0], 0);
      }
    } catch (err) {
      await this.runCompensations();
      await this.completeSaga(false);
      throw err;
    }

    if (!success) await this.runCompensations();
    await this.completeSaga(success);

    const stepResults = Object.fromEntries(this.results);
    const isEndpoint = !this.workflow.kind || this.workflow.kind.toLowerCase() === 'endpoint';
    const hasOutput =
      isEndpoint &&
      this.workflow.output !== null &&
      typeof this.workflow.output === 'object' &&
      Object.keys(this.workflow.output as object).length > 0;

    this.logger.log(`Workflow ${this.workflow.name ?? ''} completed. Success=${success}`);
    return {
      success,
      hasOutput,
      output: hasOutput && success ? this.resolveOutput(this.workflow.output) : undefined,
      steps: stepResults,
      sagaId: this.sagaId,
      compensatedSteps: [...this.compensatedSteps],
    };
  }

  // ── saga / compensation ────────────────────────────────────────────────

  private async completeSaga(success: boolean): Promise<void> {
    const status: SagaStatus = success ? 'Completed' : this.compensationsExecuted ? 'Compensated' : 'Failed';
    try {
      await this.sagaStore.complete(this.sagaId, status);
    } catch (err) {
      this.logger.warn(`Saga store complete failed for ${this.sagaId}: ${errMessage(err)}`);
    }
  }

  private async registerCompensation(stepName: string, compensateName: string): Promise<void> {
    this.compensations.push({ stepName, compensateName });
    try {
      await this.sagaStore.markStepCompleted(this.sagaId, stepName);
    } catch (err) {
      this.logger.warn(`Saga store markStepCompleted failed for ${stepName}: ${errMessage(err)}`);
    }
  }

  /** Runs registered compensations once, LIFO, without following their transitions. */
  private async runCompensations(): Promise<void> {
    if (this.compensationsExecuted || this.compensationsRunning || this.compensations.length === 0) return;
    this.compensationsRunning = true;
    this.compensationsExecuted = true;
    try {
      await this.sagaStore.markCompensating(this.sagaId);
    } catch (err) {
      this.logger.warn(`Saga store markCompensating failed: ${errMessage(err)}`);
    }

    try {
      for (let i = this.compensations.length - 1; i >= 0; i--) {
        const { stepName, compensateName } = this.compensations[i];
        if (!this.workflow.steps?.[compensateName]) {
          this.logger.warn(`Compensation step ${compensateName} (for ${stepName}) not found`);
          continue;
        }
        this.logger.log(`Compensating ${stepName} via ${compensateName}`);
        let ok = false;
        try {
          ok = await this.executeStep(compensateName, 0, { followTransitions: false });
        } catch (err) {
          this.logger.error(`Compensation ${compensateName} threw: ${errMessage(err)}`);
        }
        if (!ok) {
          this.logger.error(`Compensation ${compensateName} for ${stepName} failed`);
          continue;
        }
        this.compensatedSteps.push(compensateName);
        try {
          await this.sagaStore.markStepCompensated(this.sagaId, stepName);
        } catch (err) {
          this.logger.warn(`Saga store markStepCompensated failed for ${stepName}: ${errMessage(err)}`);
        }
      }
    } finally {
      this.compensationsRunning = false;
    }
  }

  // ── steps ──────────────────────────────────────────────────────────────

  private async executeStep(stepName: string, visits: number, opts: StepOptions = {}): Promise<boolean> {
    if (visits >= MAX_STEP_VISITS) {
      this.logger.warn(`Workflow exceeded ${MAX_STEP_VISITS} step transitions (loop?) at ${stepName}`);
      return false;
    }
    if (opts.signal?.aborted) return false;
    const step = this.workflow.steps?.[stepName];
    if (!step) {
      this.logger.warn(`Step ${stepName} not found`);
      return false;
    }
    this.logger.log(`Executing step: ${stepName}`);

    if (step.condition && !this.evaluateCondition(step.condition, undefined)) {
      this.logger.log(`Skipping step ${stepName} due to condition`);
      return true;
    }

    // `dependsOn` is optional in C# and not modelled in the Nest runtime (steps run in transition order).

    const retries = parseNonNegativeInt(step.repeat);
    if (retries > 0) return this.executeWithRepeat(stepName, step, visits, opts, retries);
    return this.executeStepBody(stepName, step, visits, opts);
  }

  private async executeStepBody(
    stepName: string,
    step: WorkflowStep,
    visits: number,
    opts: StepOptions,
  ): Promise<boolean> {
    if (step.parallel?.length) return this.executeParallel(stepName, step, visits, opts);
    if (step.foreach) return this.executeForeach(stepName, step, visits, opts);

    // Virtual / transition-only step (no URL), e.g. routing hubs.
    if (!step.url?.trim()) {
      const key = opts.resultKey ?? stepName;
      this.results.set(`${key}.statusCode`, 200);
      this.results.set(`${key}.response`, { ok: true });
      if (opts.followTransitions === false) return true;
      const branched = await this.followTransitions(stepName, step, { ok: true }, visits);
      return branched ?? true;
    }

    return this.executeHttpStep(stepName, step, visits, opts);
  }

  /** Retries the step (without re-entering repeat) up to `retries` times with exponential backoff + jitter. */
  private async executeWithRepeat(
    stepName: string,
    step: WorkflowStep,
    visits: number,
    opts: StepOptions,
    retries: number,
  ): Promise<boolean> {
    const baseDelay = numberVariable(this.variables.get('retryBaseDelayMs'), DEFAULT_RETRY_BASE_DELAY_MS);
    const maxDelay = numberVariable(this.variables.get('maxRetryDelayMs'), DEFAULT_MAX_RETRY_DELAY_MS);

    let ok = false;
    for (let attempt = 0; attempt <= retries; attempt++) {
      this.variables.set('currentRetryCount', attempt);
      ok = await this.executeStepBody(stepName, step, visits, opts);
      if (ok || attempt === retries) break;
      if (opts.signal?.aborted) return false;

      const jitter = 0.75 + Math.random() * 0.5;
      const delay = Math.min(baseDelay * Math.pow(2, attempt) * jitter, maxDelay);
      this.logger.warn(`Step ${stepName} failed (attempt ${attempt + 1}/${retries + 1}); retrying in ${Math.round(delay)}ms`);
      if (!(await sleep(delay, opts.signal))) return false;
    }
    return ok;
  }

  // ── parallel ───────────────────────────────────────────────────────────

  private async executeParallel(
    stepName: string,
    step: WorkflowStep,
    visits: number,
    opts: StepOptions,
  ): Promise<boolean> {
    const children = step.parallel ?? [];
    if (children.length > MAX_PARALLEL_BRANCHES) {
      this.logger.warn(`Step ${stepName} declares ${children.length} parallel branches (max ${MAX_PARALLEL_BRANCHES})`);
      return this.finishCoordinator(stepName, step, false, visits, opts);
    }
    const missing = children.filter((c) => !this.workflow.steps?.[c]);
    if (missing.length > 0) {
      this.logger.warn(`Step ${stepName} parallel children not found: ${missing.join(', ')}`);
      return this.finishCoordinator(stepName, step, false, visits, opts);
    }

    const join = (step.join ?? 'all').trim().toLowerCase();
    const failFast = join === 'failfast';
    const anyMode = join === 'any';

    // Child signal: aborted by failFast or when the parent is cancelled.
    const group = new AbortController();
    const onParentAbort = () => group.abort();
    opts.signal?.addEventListener('abort', onParentAbort, { once: true });

    let outcomes: boolean[];
    try {
      outcomes = await Promise.all(
        children.map(async (child) => {
          let ok = false;
          try {
            ok = await this.executeStep(child, visits + 1, { followTransitions: false, signal: group.signal });
          } catch (err) {
            this.logger.error(`Parallel child ${child} of ${stepName} threw: ${errMessage(err)}`);
          }
          if (!ok && failFast) group.abort();
          return ok;
        }),
      );
    } finally {
      opts.signal?.removeEventListener('abort', onParentAbort);
    }

    const joinSucceeded = anyMode ? outcomes.some(Boolean) : outcomes.every(Boolean);
    return this.finishCoordinator(stepName, step, joinSucceeded, visits, opts);
  }

  /** Stores `{ok}` for a coordinator step and follows its transitions (when allowed). */
  private async finishCoordinator(
    stepName: string,
    step: WorkflowStep,
    ok: boolean,
    visits: number,
    opts: StepOptions,
  ): Promise<boolean> {
    const key = opts.resultKey ?? stepName;
    this.results.set(`${key}.statusCode`, ok ? 200 : 500);
    this.results.set(`${key}.response`, { ok });
    if (opts.followTransitions === false) return ok;
    const branched = await this.followTransitions(stepName, step, { ok }, visits);
    return branched ?? ok;
  }

  // ── foreach ────────────────────────────────────────────────────────────

  private async executeForeach(
    stepName: string,
    step: WorkflowStep,
    visits: number,
    opts: StepOptions,
  ): Promise<boolean> {
    const itemStepName = step.step?.trim();
    if (!itemStepName || !this.workflow.steps?.[itemStepName]) {
      this.logger.warn(`Step ${stepName} foreach item step '${step.step ?? ''}' not found`);
      return this.finishCoordinator(stepName, step, false, visits, opts);
    }

    const resolved = this.resolveForeachItems(step.foreach ?? '');
    if (!resolved) {
      this.logger.warn(`Step ${stepName} foreach '${step.foreach}' did not resolve to an array`);
      return this.finishCoordinator(stepName, step, false, visits, opts);
    }

    const requested = parseNonNegativeInt(step.maxItems);
    const limit = requested > 0 ? Math.min(requested, MAX_FOREACH_ITEMS) : MAX_FOREACH_ITEMS;
    if (resolved.length > limit) {
      this.logger.warn(`Step ${stepName} foreach has ${resolved.length} items; processing first ${limit}`);
    }
    const items = resolved.slice(0, limit);
    const alias = step.as?.trim() || 'item';
    const parallelMode = (step.mode ?? 'sequential').trim().toLowerCase() === 'parallel';

    const runItem = async (index: number): Promise<boolean> => {
      try {
        return await this.executeStep(itemStepName, visits + 1, {
          followTransitions: false,
          signal: opts.signal,
          resultKey: `${itemStepName}.${index}`,
          itemScope: { alias, item: items[index] },
        });
      } catch (err) {
        this.logger.error(`Foreach item ${index} of ${stepName} threw: ${errMessage(err)}`);
        return false;
      }
    };

    let ok = true;
    if (parallelMode) {
      for (let offset = 0; offset < items.length && ok; offset += MAX_PARALLEL_BRANCHES) {
        const indexes = items.slice(offset, offset + MAX_PARALLEL_BRANCHES).map((_, i) => offset + i);
        const outcomes = await Promise.all(indexes.map(runItem));
        if (outcomes.some((o) => !o)) ok = false;
      }
    } else {
      for (let i = 0; i < items.length; i++) {
        if (!(await runItem(i))) {
          ok = false;
          break;
        }
      }
    }

    return this.finishCoordinator(stepName, step, ok, visits, opts);
  }

  private resolveForeachItems(expression: string): unknown[] | null {
    const trimmed = expression.trim();
    const inputMatch = /^\{\{\s*input\.(.+?)\s*\}\}$/.exec(trimmed);
    if (inputMatch) {
      const value = getPath(this.input, inputMatch[1]);
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') {
        const parsed = tryParseJson(value);
        return parsed.ok && Array.isArray(parsed.value) ? parsed.value : null;
      }
      return null;
    }
    const replaced = this.replaceTokens(trimmed);
    const parsed = tryParseJson(replaced);
    return parsed.ok && Array.isArray(parsed.value) ? parsed.value : null;
  }

  // ── http ───────────────────────────────────────────────────────────────

  private async executeHttpStep(
    stepName: string,
    step: WorkflowStep,
    visits: number,
    opts: StepOptions = {},
  ): Promise<boolean> {
    const resultKey = opts.resultKey ?? stepName;
    const method = (step.method ?? 'GET').toUpperCase();

    // Build the request synchronously so the item alias is only in scope for this request.
    let url: string;
    const headers = new Headers();
    let body: string | undefined;
    const scope = opts.itemScope;
    if (scope) this.itemScopes.set(scope.alias, scope.item);
    try {
      url = this.replaceTokens(step.url ?? '');
      let hasContentType = false;
      for (const [key, value] of Object.entries(step.headers ?? {})) {
        if (key.toLowerCase() === 'content-type') hasContentType = true;
        headers.set(key, this.replaceTokens(String(value)));
      }
      if (this.correlationId && !headers.has('X-Correlation-Id')) {
        headers.set('X-Correlation-Id', this.correlationId);
      }

      if (step.body && typeof step.body === 'object' && Object.keys(step.body as object).length > 0) {
        if (method === 'GET' || method === 'HEAD') {
          this.logger.warn(`Step ${stepName}: body ignored for ${method}`);
        } else {
          body = JSON.stringify(this.replaceTokensDeep(step.body));
          if (!hasContentType) headers.set('Content-Type', 'application/json');
        }
      }
    } finally {
      if (scope) this.itemScopes.delete(scope.alias);
    }

    const timeoutMs = (step.timeoutSeconds && step.timeoutSeconds > 0 ? step.timeoutSeconds : DEFAULT_TIMEOUT_SECONDS) * 1000;
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    const onExternalAbort = () => controller.abort();
    if (opts.signal?.aborted) controller.abort();
    else opts.signal?.addEventListener('abort', onExternalAbort, { once: true });

    try {
      const response = await this.fetchImpl(url, { method, headers, body, signal: controller.signal });
      this.results.set(`${resultKey}.statusCode`, response.status);

      const text = await response.text();
      const parsed = tryParseJson(text);
      this.results.set(`${resultKey}.response`, parsed.ok ? parsed.value : null);

      if (response.ok && step.compensate && !this.compensationsRunning) {
        await this.registerCompensation(stepName, step.compensate);
      }

      if (opts.followTransitions !== false) {
        const branched = await this.followTransitions(
          stepName,
          step,
          parsed.ok ? parsed.value : undefined,
          visits,
        );
        if (branched !== null) return branched;
      }

      this.logger.log(`Step ${stepName} completed with status code ${response.status}`);
      return response.ok;
    } catch (err) {
      if (controller.signal.aborted) {
        this.logger.warn(timedOut ? `Step ${stepName} timed out` : `Step ${stepName} cancelled`);
      } else {
        this.logger.error(`Error executing step ${stepName}: ${errMessage(err)}`);
      }
      return false;
    } finally {
      clearTimeout(timer);
      opts.signal?.removeEventListener('abort', onExternalAbort);
    }
  }

  /** Returns null when no transition matched (caller falls back to HTTP status). */
  private async followTransitions(
    stepName: string,
    step: WorkflowStep,
    response: unknown,
    visits: number,
  ): Promise<boolean | null> {
    if (!step.transitions?.length) return null;

    for (const transition of step.transitions) {
      if (!this.evaluateCondition(transition.condition, response)) continue;

      const action = (transition.action ?? '').trim();
      const lower = action.toLowerCase();
      if (!action || lower === 'success' || lower === 'end' || lower === 'fail') {
        this.logger.log(`Step ${stepName} reached terminal action ${action || 'success'}`);
        return lower !== 'fail';
      }
      if (!this.workflow.steps?.[action]) {
        this.logger.warn(`Transition from ${stepName} targets unknown step ${action}`);
        return false;
      }
      return this.executeStep(action, visits + 1);
    }
    return null;
  }

  // ── conditions ─────────────────────────────────────────────────────────

  evaluateCondition(condition: string | undefined, response: unknown): boolean {
    const trimmed = condition?.trim();
    if (!trimmed || trimmed === 'default') return true;
    return trimmed
      .split('&&')
      .filter((s) => s.trim())
      .every((and) =>
        and
          .split('||')
          .filter((s) => s.trim())
          .some((or) => this.evaluateSingle(or.trim(), response)),
      );
  }

  private evaluateSingle(condition: string, response: unknown): boolean {
    const m = /(\w+(?:\.\w+)*)\s*(==|!=|>=|<=|>|<)\s*(.+)/.exec(condition);
    if (!m) return false;
    const left = this.getConditionValue(m[1].trim(), response);
    const right = this.getConditionValue(m[3].trim(), response);
    return compareValues(left, m[2], right);
  }

  private getConditionValue(path: string, response: unknown): unknown {
    if (path.startsWith('response.') && response !== undefined) {
      const found = getPath(response, path.slice('response.'.length));
      if (found !== undefined) return found;
    } else if (this.variables.has(path)) {
      return this.variables.get(path);
    } else if (this.results.has(path)) {
      return this.results.get(path);
    }
    return path.replace(/^["']|["']$/g, '');
  }

  // ── tokens ─────────────────────────────────────────────────────────────

  private initializeVariables(): void {
    for (const [key, def] of Object.entries(this.workflow.variables ?? {})) {
      const raw = this.replaceTokens(String(def?.value ?? ''));
      switch ((def?.type ?? '').toLowerCase()) {
        case 'int':
          this.variables.set(key, parseInt(raw, 10));
          break;
        case 'double':
          this.variables.set(key, parseFloat(raw));
          break;
        case 'bool':
          this.variables.set(key, raw.toLowerCase() === 'true');
          break;
        default:
          this.variables.set(key, raw);
      }
    }
  }

  replaceTokens(text: string): string {
    return text.replace(TOKEN_REGEX, (whole, inner: string) => this.resolveToken(inner.trim(), whole));
  }

  private replaceTokensDeep(value: unknown): unknown {
    if (typeof value === 'string') return this.replaceTokens(value);
    if (Array.isArray(value)) return value.map((v) => this.replaceTokensDeep(v));
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, this.replaceTokensDeep(v)]),
      );
    }
    return value;
  }

  private resolveToken(key: string, fallback: string): string {
    if (key.startsWith('QuickcodeClients.') || key.startsWith('ThirdPartyServices.')) {
      const value = resolveConfigValue(key);
      return value ? value.replace(/\/+$/, '') : fallback;
    }
    if (key.startsWith('parameters.')) {
      const value = resolveConfigValue(key.slice('parameters.'.length), ['WorkflowParameters', 'Parameters']);
      return value ? value.replace(/\/+$/, '') : fallback;
    }
    if (key.startsWith('secrets.')) {
      return resolveConfigValue(key.slice('secrets.'.length), ['WorkflowSecrets', 'Secrets']) ?? fallback;
    }
    if (key.startsWith('GatewayServiceToken.')) {
      const target = key.slice('GatewayServiceToken.'.length);
      const token = createGatewayServiceToken(target);
      if (!token) {
        this.logger.warn(`GatewayServiceToken for ${target} unavailable (GATEWAY_JWT_PRIVATE_KEY missing)`);
        return '';
      }
      return token;
    }
    if (key.startsWith('variables.')) {
      const v = this.variables.get(key.slice('variables.'.length));
      return v === undefined || v === null ? fallback : String(v);
    }
    if (key.startsWith('input.')) {
      return stringifyToken(getPath(this.input, key.slice('input.'.length)), fallback);
    }
    const scoped = this.resolveItemToken(key);
    if (scoped !== undefined) return stringifyToken(scoped.value, fallback);
    return this.resolveResultToken(key, fallback);
  }

  /** `{{item}}` / `{{item.sku}}` from the current foreach scope (alias set by `as:`). */
  private resolveItemToken(key: string): { value: unknown } | undefined {
    for (const [alias, item] of this.itemScopes) {
      if (key === alias) return { value: item };
      if (key.startsWith(`${alias}.`)) return { value: getPath(item, key.slice(alias.length + 1)) };
    }
    return undefined;
  }

  /** `{{step.statusCode}}`, `{{step.response}}`, `{{step.response.a.b}}` */
  private resolveResultToken(key: string, fallback: string): string {
    if (this.results.has(key)) return stringifyToken(this.results.get(key), fallback);

    let dot = key.indexOf('.');
    while (dot > 0) {
      const prefix = key.slice(0, dot);
      if (this.results.has(prefix)) {
        return stringifyToken(getPath(this.results.get(prefix), key.slice(dot + 1)), fallback);
      }
      dot = key.indexOf('.', dot + 1);
    }
    return fallback;
  }

  // ── output ─────────────────────────────────────────────────────────────

  private resolveOutput(token: unknown): unknown {
    if (Array.isArray(token)) return token.map((t) => this.resolveOutput(t));
    if (token && typeof token === 'object') {
      return Object.fromEntries(
        Object.entries(token as Record<string, unknown>).map(([k, v]) => [k, this.resolveOutput(v)]),
      );
    }
    if (typeof token !== 'string') return token ?? null;

    const replaced = this.replaceTokens(token);
    if (replaced !== token) {
      const parsed = tryParseJson(replaced);
      if (parsed.ok) return parsed.value;
    }
    if (/^(true|false)$/i.test(replaced)) return replaced.toLowerCase() === 'true';
    if (/^-?\d+$/.test(replaced) && Number.isSafeInteger(Number(replaced))) return Number(replaced);
    if (/^-?\d*\.\d+(?:[eE][+-]?\d+)?$/.test(replaced)) return Number(replaced);
    return replaced;
  }
}

// ── helpers ────────────────────────────────────────────────────────────────

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function parseNonNegativeInt(value: unknown): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? parseInt(value.trim(), 10) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function numberVariable(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** Resolves true after `ms`, or false early when the signal aborts. */
function sleep(ms: number, signal?: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve(false);
    const onAbort = () => {
      clearTimeout(timer);
      resolve(false);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve(true);
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function tryParseJson(text: string): { ok: true; value: unknown } | { ok: false } {
  if (!text || !text.trim()) return { ok: false };
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}

/** Dot / `[n]` path lookup with case-insensitive property fallback. */
function getPath(source: unknown, path: string): unknown {
  let current: unknown = source;
  for (const segment of path.split(/\.|\[(\d+)\]/).filter((s) => s !== undefined && s !== '')) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined;
    const obj = current as Record<string, unknown>;
    if (segment in obj) {
      current = obj[segment];
      continue;
    }
    const ci = Object.keys(obj).find((k) => k.toLowerCase() === segment.toLowerCase());
    if (ci === undefined) return undefined;
    current = obj[ci];
  }
  return current;
}

function stringifyToken(value: unknown, fallback: string): string {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function isNumeric(value: unknown): boolean {
  if (typeof value === 'number') return Number.isFinite(value);
  return typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value));
}

function compareValues(left: unknown, op: string, right: unknown): boolean {
  if (isNumeric(left) && isNumeric(right)) {
    const l = Number(left);
    const r = Number(right);
    switch (op) {
      case '==': return Math.abs(l - r) < 1e-6;
      case '!=': return Math.abs(l - r) >= 1e-6;
      case '>': return l > r;
      case '<': return l < r;
      case '>=': return l >= r;
      case '<=': return l <= r;
      default: return false;
    }
  }
  const l = String(left ?? '').toLowerCase();
  const r = String(right ?? '').toLowerCase();
  if (op === '==') return l === r;
  if (op === '!=') return l !== r;
  return false;
}

/**
 * `QuickcodeClients.IdentityModuleApi` → env `QuickcodeClients__IdentityModuleApi`
 * (ASP.NET style) or `IDENTITY_MODULE_API` (snake). Section roots are tried in order for parameters/secrets.
 */
function resolveConfigValue(dotted: string, roots: string[] = ['']): string | undefined {
  const candidates: string[] = [];
  for (const root of roots) {
    const full = root ? `${root}.${dotted}` : dotted;
    candidates.push(full.replace(/\./g, '__'), full.replace(/\./g, '__').toUpperCase());
  }
  const last = dotted.split('.').pop() ?? dotted;
  if (!roots.some((r) => r)) {
    candidates.push(last.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase());
  }
  for (const name of candidates) {
    const v = process.env[name];
    if (v && v.trim()) return v.trim();
  }
  return undefined;
}
