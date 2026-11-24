import { INestApplication, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * C# Swashbuckle paths the Gateway dashboard iframes:
 *   UI   /swagger/index.html  (YARP: /swagger/{module}-api/index.html)
 *   JSON /swagger/v1/swagger.json
 *
 * @nestjs/swagger v7 serves UI at /swagger and /swagger/ only — not index.html.
 * rewriteSwaggerIndexHtmlUrl maps the Swashbuckle URL onto Nest's handler without
 * an HTTP redirect (a redirect would escape the YARP /swagger/{module}/ prefix).
 */
export const SWAGGER_UI_ROUTE = 'swagger';
export const SWAGGER_JSON_ROUTE = 'swagger/v1/swagger.json';
export const SWAGGER_YAML_ROUTE = 'swagger/v1/swagger.yaml';

export function isSwaggerPath(path: string): boolean {
  const pathname = (path.split('?')[0] || '').toLowerCase();
  return pathname === '/swagger' || pathname.startsWith('/swagger/');
}

export function rewriteSwaggerIndexHtmlUrl(url: string): string {
  const q = url.indexOf('?');
  const hash = url.indexOf('#');
  let end = url.length;
  if (q >= 0) end = q;
  if (hash >= 0 && hash < end) end = hash;
  const pathname = url.slice(0, end);
  if (pathname !== '/swagger/index.html') return url;
  return `/swagger${url.slice(end)}`;
}

export function setupCsharpCompatibleSwagger(
  app: INestApplication,
  title: string,
): void {
  const config = new DocumentBuilder()
    .setTitle(title)
    .setVersion('v1')
    .setTermsOfService('https://www.quickcode.net')
    .setContact('Üzeyir Apaydın', 'https://www.quickcode.net', '')
    .setLicense('QuickCode.Net License', 'https://www.quickcode.net')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'Bearer',
        description: 'Please enter a valid token',
      },
      'Bearer',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) => {
      const controller = controllerKey.replace(/Controller$/, '');
      const action = methodKey.replace(/Async$/i, '');
      return `${controller}${action.charAt(0).toUpperCase()}${action.slice(1)}`;
    },
  });

  SwaggerModule.setup(SWAGGER_UI_ROUTE, app, document, {
    jsonDocumentUrl: SWAGGER_JSON_ROUTE,
    yamlDocumentUrl: SWAGGER_YAML_ROUTE,
    customSiteTitle: title,
    swaggerOptions: { persistAuthorization: true },
  });

  new Logger('Swagger').log(
    `Swagger UI → /swagger and /swagger/index.html  JSON → /${SWAGGER_JSON_ROUTE}`,
  );
}
