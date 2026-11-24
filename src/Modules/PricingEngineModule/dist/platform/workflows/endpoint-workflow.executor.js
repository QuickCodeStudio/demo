"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var EndpointWorkflowExecutor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EndpointWorkflowExecutor = void 0;
const crypto_1 = require("crypto");
const common_1 = require("@nestjs/common");
const yaml_1 = require("yaml");
const gateway_jwt_middleware_1 = require("../gateway-jwt.middleware");
const in_memory_saga_store_1 = require("./in-memory-saga-store");
const MAX_STEP_VISITS = 100;
const MAX_PARALLEL_BRANCHES = 8;
const MAX_FOREACH_ITEMS = 100;
const DEFAULT_TIMEOUT_SECONDS = 30;
const DEFAULT_RETRY_BASE_DELAY_MS = 1000;
const DEFAULT_MAX_RETRY_DELAY_MS = 30000;
const TOKEN_REGEX = /\{\{(.*?)\}\}/g;
let EndpointWorkflowExecutor = EndpointWorkflowExecutor_1 = class EndpointWorkflowExecutor {
    constructor(sagaStore) {
        this.logger = new common_1.Logger(EndpointWorkflowExecutor_1.name);
        this.fetchImpl = (input, init) => fetch(input, init);
        this.sagaStore = sagaStore ?? in_memory_saga_store_1.sharedInMemorySagaStore;
    }
    async execute(entry, input, correlationId) {
        const workflow = ((0, yaml_1.parse)(entry.workflowContent) ?? {});
        const run = new WorkflowRun(workflow, input, correlationId, this.fetchImpl, this.logger, this.sagaStore);
        return run.execute();
    }
};
exports.EndpointWorkflowExecutor = EndpointWorkflowExecutor;
exports.EndpointWorkflowExecutor = EndpointWorkflowExecutor = EndpointWorkflowExecutor_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Optional)()),
    __param(0, (0, common_1.Inject)(in_memory_saga_store_1.SAGA_STATE_STORE)),
    __metadata("design:paramtypes", [Object])
], EndpointWorkflowExecutor);
class WorkflowRun {
    constructor(workflow, input, correlationId, fetchImpl, logger, sagaStore) {
        this.workflow = workflow;
        this.input = input;
        this.correlationId = correlationId;
        this.fetchImpl = fetchImpl;
        this.logger = logger;
        this.sagaStore = sagaStore;
        this.results = new Map();
        this.variables = new Map();
        this.itemScopes = new Map();
        this.compensations = [];
        this.compensatedSteps = [];
        this.compensationsRunning = false;
        this.compensationsExecuted = false;
        this.sagaId = (0, crypto_1.randomUUID)();
    }
    async execute() {
        this.logger.log(`Starting workflow: ${this.workflow.name ?? '(unnamed)'} CorrelationId=${this.correlationId ?? ''}`);
        this.initializeVariables();
        await this.sagaStore.start(this.sagaId, this.workflow.name ?? '', this.correlationId);
        const steps = this.workflow.steps ?? {};
        const names = Object.keys(steps);
        let success = true;
        try {
            if (names.length === 0) {
                this.logger.warn(`Workflow ${this.workflow.name ?? ''} has no steps`);
            }
            else {
                success = await this.executeStep(names[0], 0);
            }
        }
        catch (err) {
            await this.runCompensations();
            await this.completeSaga(false);
            throw err;
        }
        if (!success)
            await this.runCompensations();
        await this.completeSaga(success);
        const stepResults = Object.fromEntries(this.results);
        const isEndpoint = !this.workflow.kind || this.workflow.kind.toLowerCase() === 'endpoint';
        const hasOutput = isEndpoint &&
            this.workflow.output !== null &&
            typeof this.workflow.output === 'object' &&
            Object.keys(this.workflow.output).length > 0;
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
    async completeSaga(success) {
        const status = success ? 'Completed' : this.compensationsExecuted ? 'Compensated' : 'Failed';
        try {
            await this.sagaStore.complete(this.sagaId, status);
        }
        catch (err) {
            this.logger.warn(`Saga store complete failed for ${this.sagaId}: ${errMessage(err)}`);
        }
    }
    async registerCompensation(stepName, compensateName) {
        this.compensations.push({ stepName, compensateName });
        try {
            await this.sagaStore.markStepCompleted(this.sagaId, stepName);
        }
        catch (err) {
            this.logger.warn(`Saga store markStepCompleted failed for ${stepName}: ${errMessage(err)}`);
        }
    }
    async runCompensations() {
        if (this.compensationsExecuted || this.compensationsRunning || this.compensations.length === 0)
            return;
        this.compensationsRunning = true;
        this.compensationsExecuted = true;
        try {
            await this.sagaStore.markCompensating(this.sagaId);
        }
        catch (err) {
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
                }
                catch (err) {
                    this.logger.error(`Compensation ${compensateName} threw: ${errMessage(err)}`);
                }
                if (!ok) {
                    this.logger.error(`Compensation ${compensateName} for ${stepName} failed`);
                    continue;
                }
                this.compensatedSteps.push(compensateName);
                try {
                    await this.sagaStore.markStepCompensated(this.sagaId, stepName);
                }
                catch (err) {
                    this.logger.warn(`Saga store markStepCompensated failed for ${stepName}: ${errMessage(err)}`);
                }
            }
        }
        finally {
            this.compensationsRunning = false;
        }
    }
    async executeStep(stepName, visits, opts = {}) {
        if (visits >= MAX_STEP_VISITS) {
            this.logger.warn(`Workflow exceeded ${MAX_STEP_VISITS} step transitions (loop?) at ${stepName}`);
            return false;
        }
        if (opts.signal?.aborted)
            return false;
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
        const retries = parseNonNegativeInt(step.repeat);
        if (retries > 0)
            return this.executeWithRepeat(stepName, step, visits, opts, retries);
        return this.executeStepBody(stepName, step, visits, opts);
    }
    async executeStepBody(stepName, step, visits, opts) {
        if (step.parallel?.length)
            return this.executeParallel(stepName, step, visits, opts);
        if (step.foreach)
            return this.executeForeach(stepName, step, visits, opts);
        if (!step.url?.trim()) {
            const key = opts.resultKey ?? stepName;
            this.results.set(`${key}.statusCode`, 200);
            this.results.set(`${key}.response`, { ok: true });
            if (opts.followTransitions === false)
                return true;
            const branched = await this.followTransitions(stepName, step, { ok: true }, visits);
            return branched ?? true;
        }
        return this.executeHttpStep(stepName, step, visits, opts);
    }
    async executeWithRepeat(stepName, step, visits, opts, retries) {
        const baseDelay = numberVariable(this.variables.get('retryBaseDelayMs'), DEFAULT_RETRY_BASE_DELAY_MS);
        const maxDelay = numberVariable(this.variables.get('maxRetryDelayMs'), DEFAULT_MAX_RETRY_DELAY_MS);
        let ok = false;
        for (let attempt = 0; attempt <= retries; attempt++) {
            this.variables.set('currentRetryCount', attempt);
            ok = await this.executeStepBody(stepName, step, visits, opts);
            if (ok || attempt === retries)
                break;
            if (opts.signal?.aborted)
                return false;
            const jitter = 0.75 + Math.random() * 0.5;
            const delay = Math.min(baseDelay * Math.pow(2, attempt) * jitter, maxDelay);
            this.logger.warn(`Step ${stepName} failed (attempt ${attempt + 1}/${retries + 1}); retrying in ${Math.round(delay)}ms`);
            if (!(await sleep(delay, opts.signal)))
                return false;
        }
        return ok;
    }
    async executeParallel(stepName, step, visits, opts) {
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
        const group = new AbortController();
        const onParentAbort = () => group.abort();
        opts.signal?.addEventListener('abort', onParentAbort, { once: true });
        let outcomes;
        try {
            outcomes = await Promise.all(children.map(async (child) => {
                let ok = false;
                try {
                    ok = await this.executeStep(child, visits + 1, { followTransitions: false, signal: group.signal });
                }
                catch (err) {
                    this.logger.error(`Parallel child ${child} of ${stepName} threw: ${errMessage(err)}`);
                }
                if (!ok && failFast)
                    group.abort();
                return ok;
            }));
        }
        finally {
            opts.signal?.removeEventListener('abort', onParentAbort);
        }
        const joinSucceeded = anyMode ? outcomes.some(Boolean) : outcomes.every(Boolean);
        return this.finishCoordinator(stepName, step, joinSucceeded, visits, opts);
    }
    async finishCoordinator(stepName, step, ok, visits, opts) {
        const key = opts.resultKey ?? stepName;
        this.results.set(`${key}.statusCode`, ok ? 200 : 500);
        this.results.set(`${key}.response`, { ok });
        if (opts.followTransitions === false)
            return ok;
        const branched = await this.followTransitions(stepName, step, { ok }, visits);
        return branched ?? ok;
    }
    async executeForeach(stepName, step, visits, opts) {
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
        const runItem = async (index) => {
            try {
                return await this.executeStep(itemStepName, visits + 1, {
                    followTransitions: false,
                    signal: opts.signal,
                    resultKey: `${itemStepName}.${index}`,
                    itemScope: { alias, item: items[index] },
                });
            }
            catch (err) {
                this.logger.error(`Foreach item ${index} of ${stepName} threw: ${errMessage(err)}`);
                return false;
            }
        };
        let ok = true;
        if (parallelMode) {
            for (let offset = 0; offset < items.length && ok; offset += MAX_PARALLEL_BRANCHES) {
                const indexes = items.slice(offset, offset + MAX_PARALLEL_BRANCHES).map((_, i) => offset + i);
                const outcomes = await Promise.all(indexes.map(runItem));
                if (outcomes.some((o) => !o))
                    ok = false;
            }
        }
        else {
            for (let i = 0; i < items.length; i++) {
                if (!(await runItem(i))) {
                    ok = false;
                    break;
                }
            }
        }
        return this.finishCoordinator(stepName, step, ok, visits, opts);
    }
    resolveForeachItems(expression) {
        const trimmed = expression.trim();
        const inputMatch = /^\{\{\s*input\.(.+?)\s*\}\}$/.exec(trimmed);
        if (inputMatch) {
            const value = getPath(this.input, inputMatch[1]);
            if (Array.isArray(value))
                return value;
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
    async executeHttpStep(stepName, step, visits, opts = {}) {
        const resultKey = opts.resultKey ?? stepName;
        const method = (step.method ?? 'GET').toUpperCase();
        let url;
        const headers = new Headers();
        let body;
        const scope = opts.itemScope;
        if (scope)
            this.itemScopes.set(scope.alias, scope.item);
        try {
            url = this.replaceTokens(step.url ?? '');
            let hasContentType = false;
            for (const [key, value] of Object.entries(step.headers ?? {})) {
                if (key.toLowerCase() === 'content-type')
                    hasContentType = true;
                headers.set(key, this.replaceTokens(String(value)));
            }
            if (this.correlationId && !headers.has('X-Correlation-Id')) {
                headers.set('X-Correlation-Id', this.correlationId);
            }
            if (step.body && typeof step.body === 'object' && Object.keys(step.body).length > 0) {
                if (method === 'GET' || method === 'HEAD') {
                    this.logger.warn(`Step ${stepName}: body ignored for ${method}`);
                }
                else {
                    body = JSON.stringify(this.replaceTokensDeep(step.body));
                    if (!hasContentType)
                        headers.set('Content-Type', 'application/json');
                }
            }
        }
        finally {
            if (scope)
                this.itemScopes.delete(scope.alias);
        }
        const timeoutMs = (step.timeoutSeconds && step.timeoutSeconds > 0 ? step.timeoutSeconds : DEFAULT_TIMEOUT_SECONDS) * 1000;
        const controller = new AbortController();
        let timedOut = false;
        const timer = setTimeout(() => {
            timedOut = true;
            controller.abort();
        }, timeoutMs);
        const onExternalAbort = () => controller.abort();
        if (opts.signal?.aborted)
            controller.abort();
        else
            opts.signal?.addEventListener('abort', onExternalAbort, { once: true });
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
                const branched = await this.followTransitions(stepName, step, parsed.ok ? parsed.value : undefined, visits);
                if (branched !== null)
                    return branched;
            }
            this.logger.log(`Step ${stepName} completed with status code ${response.status}`);
            return response.ok;
        }
        catch (err) {
            if (controller.signal.aborted) {
                this.logger.warn(timedOut ? `Step ${stepName} timed out` : `Step ${stepName} cancelled`);
            }
            else {
                this.logger.error(`Error executing step ${stepName}: ${errMessage(err)}`);
            }
            return false;
        }
        finally {
            clearTimeout(timer);
            opts.signal?.removeEventListener('abort', onExternalAbort);
        }
    }
    async followTransitions(stepName, step, response, visits) {
        if (!step.transitions?.length)
            return null;
        for (const transition of step.transitions) {
            if (!this.evaluateCondition(transition.condition, response))
                continue;
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
    evaluateCondition(condition, response) {
        const trimmed = condition?.trim();
        if (!trimmed || trimmed === 'default')
            return true;
        return trimmed
            .split('&&')
            .filter((s) => s.trim())
            .every((and) => and
            .split('||')
            .filter((s) => s.trim())
            .some((or) => this.evaluateSingle(or.trim(), response)));
    }
    evaluateSingle(condition, response) {
        const m = /(\w+(?:\.\w+)*)\s*(==|!=|>=|<=|>|<)\s*(.+)/.exec(condition);
        if (!m)
            return false;
        const left = this.getConditionValue(m[1].trim(), response);
        const right = this.getConditionValue(m[3].trim(), response);
        return compareValues(left, m[2], right);
    }
    getConditionValue(path, response) {
        if (path.startsWith('response.') && response !== undefined) {
            const found = getPath(response, path.slice('response.'.length));
            if (found !== undefined)
                return found;
        }
        else if (this.variables.has(path)) {
            return this.variables.get(path);
        }
        else if (this.results.has(path)) {
            return this.results.get(path);
        }
        return path.replace(/^["']|["']$/g, '');
    }
    initializeVariables() {
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
    replaceTokens(text) {
        return text.replace(TOKEN_REGEX, (whole, inner) => this.resolveToken(inner.trim(), whole));
    }
    replaceTokensDeep(value) {
        if (typeof value === 'string')
            return this.replaceTokens(value);
        if (Array.isArray(value))
            return value.map((v) => this.replaceTokensDeep(v));
        if (value && typeof value === 'object') {
            return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, this.replaceTokensDeep(v)]));
        }
        return value;
    }
    resolveToken(key, fallback) {
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
            const token = (0, gateway_jwt_middleware_1.createGatewayServiceToken)(target);
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
        if (scoped !== undefined)
            return stringifyToken(scoped.value, fallback);
        return this.resolveResultToken(key, fallback);
    }
    resolveItemToken(key) {
        for (const [alias, item] of this.itemScopes) {
            if (key === alias)
                return { value: item };
            if (key.startsWith(`${alias}.`))
                return { value: getPath(item, key.slice(alias.length + 1)) };
        }
        return undefined;
    }
    resolveResultToken(key, fallback) {
        if (this.results.has(key))
            return stringifyToken(this.results.get(key), fallback);
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
    resolveOutput(token) {
        if (Array.isArray(token))
            return token.map((t) => this.resolveOutput(t));
        if (token && typeof token === 'object') {
            return Object.fromEntries(Object.entries(token).map(([k, v]) => [k, this.resolveOutput(v)]));
        }
        if (typeof token !== 'string')
            return token ?? null;
        const replaced = this.replaceTokens(token);
        if (replaced !== token) {
            const parsed = tryParseJson(replaced);
            if (parsed.ok)
                return parsed.value;
        }
        if (/^(true|false)$/i.test(replaced))
            return replaced.toLowerCase() === 'true';
        if (/^-?\d+$/.test(replaced) && Number.isSafeInteger(Number(replaced)))
            return Number(replaced);
        if (/^-?\d*\.\d+(?:[eE][+-]?\d+)?$/.test(replaced))
            return Number(replaced);
        return replaced;
    }
}
function errMessage(err) {
    return err instanceof Error ? err.message : String(err);
}
function parseNonNegativeInt(value) {
    const n = typeof value === 'number' ? value : typeof value === 'string' ? parseInt(value.trim(), 10) : NaN;
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}
function numberVariable(value, fallback) {
    const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
    return Number.isFinite(n) && n >= 0 ? n : fallback;
}
function sleep(ms, signal) {
    return new Promise((resolve) => {
        if (signal?.aborted)
            return resolve(false);
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
function tryParseJson(text) {
    if (!text || !text.trim())
        return { ok: false };
    try {
        return { ok: true, value: JSON.parse(text) };
    }
    catch {
        return { ok: false };
    }
}
function getPath(source, path) {
    let current = source;
    for (const segment of path.split(/\.|\[(\d+)\]/).filter((s) => s !== undefined && s !== '')) {
        if (current === null || current === undefined || typeof current !== 'object')
            return undefined;
        const obj = current;
        if (segment in obj) {
            current = obj[segment];
            continue;
        }
        const ci = Object.keys(obj).find((k) => k.toLowerCase() === segment.toLowerCase());
        if (ci === undefined)
            return undefined;
        current = obj[ci];
    }
    return current;
}
function stringifyToken(value, fallback) {
    if (value === undefined || value === null)
        return fallback;
    if (typeof value === 'object')
        return JSON.stringify(value);
    return String(value);
}
function isNumeric(value) {
    if (typeof value === 'number')
        return Number.isFinite(value);
    return typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value));
}
function compareValues(left, op, right) {
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
    if (op === '==')
        return l === r;
    if (op === '!=')
        return l !== r;
    return false;
}
function resolveConfigValue(dotted, roots = ['']) {
    const candidates = [];
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
        if (v && v.trim())
            return v.trim();
    }
    return undefined;
}
//# sourceMappingURL=endpoint-workflow.executor.js.map