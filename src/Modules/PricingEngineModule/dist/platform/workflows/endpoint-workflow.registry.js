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
var EndpointWorkflowRegistry_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EndpointWorkflowRegistry = void 0;
exports.normalizeWorkflowPath = normalizeWorkflowPath;
const fs_1 = require("fs");
const path_1 = require("path");
const common_1 = require("@nestjs/common");
const endpoint_workflow_types_1 = require("./endpoint-workflow.types");
function normalizeWorkflowPath(path) {
    const noQuery = (path.split('?')[0] ?? '').trim();
    const trimmed = noQuery.replace(/^\/+|\/+$/g, '');
    return '/' + trimmed;
}
function compileTemplate(template) {
    const names = [];
    const trimmed = (template ?? '').trim().replace(/^\/+|\/+$/g, '');
    const segments = trimmed
        .split('/')
        .filter(Boolean)
        .map((segment) => {
        const m = /^\{\*?([A-Za-z_][\w]*)(?::[^}?]*)?(\?)?\}$/.exec(segment);
        if (m) {
            names.push(m[1]);
            return m[2] ? '(?:/([^/]+))?' : '/([^/]+)';
        }
        return '/' + segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    });
    return { regex: new RegExp(`^${segments.join('')}/?$`, 'i'), names };
}
let EndpointWorkflowRegistry = EndpointWorkflowRegistry_1 = class EndpointWorkflowRegistry {
    constructor() {
        this.logger = new common_1.Logger(EndpointWorkflowRegistry_1.name);
        this.byMethod = new Map();
        this.count = 0;
        this.loadFromFile();
    }
    get size() {
        return this.count;
    }
    loadFromFile(filePath) {
        const target = (0, path_1.resolve)(filePath ||
            process.env.ENDPOINT_WORKFLOWS_PATH ||
            (0, path_1.resolve)(process.cwd(), endpoint_workflow_types_1.ENDPOINT_WORKFLOW_DEFAULT_PATH));
        if (!(0, fs_1.existsSync)(target)) {
            this.register([]);
            return;
        }
        try {
            const raw = (0, fs_1.readFileSync)(target, 'utf8').trim();
            const parsed = raw ? JSON.parse(raw) : [];
            this.register(Array.isArray(parsed) ? parsed : []);
            this.logger.log(`Loaded ${this.count} endpoint workflow(s) from ${target}`);
        }
        catch (err) {
            this.logger.error(`Failed to load endpoint workflows from ${target}: ${err instanceof Error ? err.message : String(err)}`);
            this.register([]);
        }
    }
    register(entries) {
        const index = new Map();
        let count = 0;
        for (const entry of entries ?? []) {
            if (!entry ||
                entry.isActive !== true ||
                !entry.endpointPath?.trim() ||
                !entry.httpMethod?.trim() ||
                !entry.workflowContent?.trim()) {
                continue;
            }
            const method = entry.httpMethod.trim().toUpperCase();
            let bucket = index.get(method);
            if (!bucket) {
                bucket = { exact: new Map(), templates: [] };
                index.set(method, bucket);
            }
            if (entry.endpointPath.includes('{')) {
                const { regex, names } = compileTemplate(entry.endpointPath);
                bucket.templates.push({ regex, names, entry });
            }
            else {
                bucket.exact.set(normalizeWorkflowPath(entry.endpointPath).toLowerCase(), entry);
            }
            count++;
        }
        this.byMethod = index;
        this.count = count;
    }
    find(httpMethod, path) {
        if (!path || !httpMethod)
            return null;
        const bucket = this.byMethod.get(httpMethod.toUpperCase());
        if (!bucket)
            return null;
        const normalized = normalizeWorkflowPath(path);
        const exact = bucket.exact.get(normalized.toLowerCase());
        if (exact)
            return { entry: exact, pathParameters: {} };
        for (const route of bucket.templates) {
            const m = route.regex.exec(normalized);
            if (!m)
                continue;
            const pathParameters = {};
            route.names.forEach((name, i) => {
                const value = m[i + 1];
                if (value !== undefined)
                    pathParameters[name] = safeDecode(value);
            });
            return { entry: route.entry, pathParameters };
        }
        return null;
    }
};
exports.EndpointWorkflowRegistry = EndpointWorkflowRegistry;
exports.EndpointWorkflowRegistry = EndpointWorkflowRegistry = EndpointWorkflowRegistry_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], EndpointWorkflowRegistry);
function safeDecode(value) {
    try {
        return decodeURIComponent(value);
    }
    catch {
        return value;
    }
}
//# sourceMappingURL=endpoint-workflow.registry.js.map