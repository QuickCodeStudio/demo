"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const compression_1 = __importDefault(require("compression"));
const host_module_1 = require("./host.module");
const db_config_1 = require("./db/db-config");
const sql_migration_runner_1 = require("./db/sql-migration.runner");
const seed_data_runner_1 = require("./db/seed-data.runner");
const security_audit_middleware_1 = require("./auditing/security-audit.middleware");
const rate_limit_middleware_1 = require("./platform/rate-limit.middleware");
const api_log_middleware_1 = require("./platform/api-log.middleware");
const gateway_jwt_middleware_1 = require("./platform/gateway-jwt.middleware");
const security_headers_middleware_1 = require("./platform/security-headers.middleware");
const endpoint_workflow_middleware_1 = require("./platform/workflows/endpoint-workflow.middleware");
const otel_bootstrap_1 = require("./platform/observability/otel-bootstrap");
const swagger_ui_1 = require("./platform/swagger-ui");
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
    process.env.MODULE_NAME ??= 'PricingEngineModule';
    await (0, otel_bootstrap_1.startObservability)(`QuickCode.${process.env.MODULE_NAME}.Api`);
    await (0, db_config_1.ensureDatabaseExists)();
    await (0, sql_migration_runner_1.runQuickCodeSqlMigrations)();
    await (0, seed_data_runner_1.runQuickCodeSeedData)();
    const app = await core_1.NestFactory.create(host_module_1.HostModule);
    app.set('trust proxy', true);
    app.use((req, _res, next) => {
        req.url = (0, swagger_ui_1.rewriteSwaggerIndexHtmlUrl)(req.url ?? '');
        next();
    });
    app.use((0, compression_1.default)());
    configureCors(app, logger);
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: { enableImplicitConversion: true },
    }));
    if (process.env.SWAGGER_DUMP !== '1') {
        const securityHeaders = app.get(security_headers_middleware_1.SecurityHeadersMiddleware);
        const rateLimit = app.get(rate_limit_middleware_1.RateLimitMiddleware);
        const apiLog = app.get(api_log_middleware_1.ApiLogMiddleware);
        const gatewayJwt = app.get(gateway_jwt_middleware_1.GatewayJwtMiddleware);
        const endpointWorkflow = app.get(endpoint_workflow_middleware_1.EndpointWorkflowMiddleware);
        const securityAudit = app.get(security_audit_middleware_1.SecurityAuditMiddleware);
        app.use((req, res, next) => securityHeaders.use(req, res, next));
        app.use((req, res, next) => rateLimit.use(req, res, next));
        app.use((req, res, next) => apiLog.use(req, res, next));
        app.use((req, res, next) => gatewayJwt.use(req, res, next));
        app.use((req, res, next) => endpointWorkflow.use(req, res, next));
        app.use((req, res, next) => securityAudit.use(req, res, next));
    }
    const swaggerTitle = process.env.SWAGGER_TITLE ??
        `QuickCode - ${process.env.MODULE_NAME ?? 'PricingEngineModule'} Api`;
    (0, swagger_ui_1.setupCsharpCompatibleSwagger)(app, swaggerTitle);
    const port = Number(process.env.PORT ?? 80);
    await app.listen(port);
    logger.log(`PricingEngineModule API listening on ${port}`);
}
function configureCors(app, logger) {
    const raw = process.env.CORS_ALLOW_ORIGINS ||
        process.env.CorsSettings__AllowOrigins ||
        '';
    const patterns = raw
        .split(/[;,]/)
        .map((o) => o.trim())
        .filter(Boolean);
    if (patterns.length === 0) {
        logger.warn('CORS_ALLOW_ORIGINS / CorsSettings__AllowOrigins is missing or empty; CORS middleware was not registered');
        return;
    }
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin || patterns.some((p) => originMatches(p, origin))) {
                callback(null, true);
                return;
            }
            callback(null, false);
        },
        methods: '*',
        allowedHeaders: '*',
    });
}
function originMatches(pattern, origin) {
    if (pattern === origin)
        return true;
    if (!pattern.includes('*'))
        return false;
    const escaped = pattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\\\*/g, '[^.]+');
    return new RegExp(`^${escaped}$`, 'i').test(origin);
}
bootstrap();
//# sourceMappingURL=main.js.map