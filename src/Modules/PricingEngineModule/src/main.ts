import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import { HostModule } from './host.module';
import { applyConnectionStringEnvFallback, ensureDatabaseExists } from './db/db-config';
import { runQuickCodeSqlMigrations } from './db/sql-migration.runner';
import { runQuickCodeSeedData } from './db/seed-data.runner';
import { SecurityAuditMiddleware } from './auditing/security-audit.middleware';
import { RateLimitMiddleware } from './platform/rate-limit.middleware';
import { ApiLogMiddleware } from './platform/api-log.middleware';
import { GatewayJwtMiddleware } from './platform/gateway-jwt.middleware';
import { SecurityHeadersMiddleware } from './platform/security-headers.middleware';
import { EndpointWorkflowMiddleware } from './platform/workflows/endpoint-workflow.middleware';
import { startObservability } from './platform/observability/otel-bootstrap';
import {
  rewriteSwaggerIndexHtmlUrl,
  setupCsharpCompatibleSwagger,
} from './platform/swagger-ui';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Ensure MODULE_NAME for JWT audience + Kafka clientId + OTEL service name
  process.env.MODULE_NAME ??= 'PricingEngineModule';
  // Cloud Run often has only READ_CONNECTION_STRING (C# ADO) — map to DB_* first.
  applyConnectionStringEnvFallback();

  await startObservability(`QuickCode.${process.env.MODULE_NAME}.Api`);

  // Same order as C# API Program.cs: provision DB → migrate → seed → listen
  await ensureDatabaseExists();
  await runQuickCodeSqlMigrations();
  await runQuickCodeSeedData();

  const app = await NestFactory.create<NestExpressApplication>(HostModule);

  // C# UseQuickCodeForwardedHeaders — trust X-Forwarded-For / Proto behind YARP
  app.set('trust proxy', true);

  // Gateway iframes /swagger/{module}/index.html → YARP /swagger/index.html.
  // Nest UI lives at /swagger; rewrite in-place (no redirect — that would drop the module prefix).
  app.use((req: { url?: string }, _res: unknown, next: () => void) => {
    req.url = rewriteSwaggerIndexHtmlUrl(req.url ?? '');
    next();
  });

  // C# UseResponseCompression
  app.use(compression());

  configureCors(app, logger);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  if (process.env.SWAGGER_DUMP !== '1') {
    // C# pipeline (simplified): security headers → rate limit → api log → jwt → endpoint workflows → security audit
    const securityHeaders = app.get(SecurityHeadersMiddleware);
    const rateLimit = app.get(RateLimitMiddleware);
    const apiLog = app.get(ApiLogMiddleware);
    const gatewayJwt = app.get(GatewayJwtMiddleware);
    const endpointWorkflow = app.get(EndpointWorkflowMiddleware);
    const securityAudit = app.get(SecurityAuditMiddleware);
    app.use((req: any, res: any, next: any) => securityHeaders.use(req, res, next));
    app.use((req: any, res: any, next: any) => rateLimit.use(req, res, next));
    app.use((req: any, res: any, next: any) => apiLog.use(req, res, next));
    app.use((req: any, res: any, next: any) => gatewayJwt.use(req, res, next));
    // C# UseModuleEndpointWorkflows — after auth, before MVC routing
    app.use((req: any, res: any, next: any) => endpointWorkflow.use(req, res, next));
    app.use((req: any, res: any, next: any) => securityAudit.use(req, res, next));
  }

  const swaggerTitle =
    process.env.SWAGGER_TITLE ??
    `QuickCode - ${process.env.MODULE_NAME ?? 'PricingEngineModule'} Api`;
  setupCsharpCompatibleSwagger(app, swaggerTitle);

  const port = Number(process.env.PORT ?? 80);
  // Cloud Run requires 0.0.0.0 (not default localhost-only in some Nest/Node builds).
  await app.listen(port, '0.0.0.0');
  logger.log(`PricingEngineModule API listening on ${port}`);
}

function configureCors(app: NestExpressApplication, logger: Logger): void {
  const raw =
    process.env.CORS_ALLOW_ORIGINS ||
    process.env.CorsSettings__AllowOrigins ||
    '';
  const patterns = raw
    .split(/[;,]/)
    .map((o) => o.trim())
    .filter(Boolean);
  if (patterns.length === 0) {
    logger.warn(
      'CORS_ALLOW_ORIGINS / CorsSettings__AllowOrigins is missing or empty; CORS middleware was not registered',
    );
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

/** C# SetIsOriginAllowedToAllowWildcardSubdomains parity for patterns like https://*.quickcode.net */
function originMatches(pattern: string, origin: string): boolean {
  if (pattern === origin) return true;
  if (!pattern.includes('*')) return false;
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\\\*/g, '[^.]+');
  return new RegExp(`^${escaped}$`, 'i').test(origin);
}

bootstrap();
