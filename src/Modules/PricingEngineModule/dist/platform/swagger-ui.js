"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SWAGGER_YAML_ROUTE = exports.SWAGGER_JSON_ROUTE = exports.SWAGGER_UI_ROUTE = void 0;
exports.isSwaggerPath = isSwaggerPath;
exports.rewriteSwaggerIndexHtmlUrl = rewriteSwaggerIndexHtmlUrl;
exports.setupCsharpCompatibleSwagger = setupCsharpCompatibleSwagger;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
exports.SWAGGER_UI_ROUTE = 'swagger';
exports.SWAGGER_JSON_ROUTE = 'swagger/v1/swagger.json';
exports.SWAGGER_YAML_ROUTE = 'swagger/v1/swagger.yaml';
function isSwaggerPath(path) {
    const pathname = (path.split('?')[0] || '').toLowerCase();
    return pathname === '/swagger' || pathname.startsWith('/swagger/');
}
function rewriteSwaggerIndexHtmlUrl(url) {
    const q = url.indexOf('?');
    const hash = url.indexOf('#');
    let end = url.length;
    if (q >= 0)
        end = q;
    if (hash >= 0 && hash < end)
        end = hash;
    const pathname = url.slice(0, end);
    if (pathname !== '/swagger/index.html')
        return url;
    return `/swagger${url.slice(end)}`;
}
function setupCsharpCompatibleSwagger(app, title) {
    const config = new swagger_1.DocumentBuilder()
        .setTitle(title)
        .setVersion('v1')
        .setTermsOfService('https://www.quickcode.net')
        .setContact('Üzeyir Apaydın', 'https://www.quickcode.net', '')
        .setLicense('QuickCode.Net License', 'https://www.quickcode.net')
        .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'Bearer',
        description: 'Please enter a valid token',
    }, 'Bearer')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config, {
        operationIdFactory: (controllerKey, methodKey) => {
            const controller = controllerKey.replace(/Controller$/, '');
            const action = methodKey.replace(/Async$/i, '');
            return `${controller}${action.charAt(0).toUpperCase()}${action.slice(1)}`;
        },
    });
    swagger_1.SwaggerModule.setup(exports.SWAGGER_UI_ROUTE, app, document, {
        jsonDocumentUrl: exports.SWAGGER_JSON_ROUTE,
        yamlDocumentUrl: exports.SWAGGER_YAML_ROUTE,
        customSiteTitle: title,
        swaggerOptions: { persistAuthorization: true },
    });
    new common_1.Logger('Swagger').log(`Swagger UI → /swagger and /swagger/index.html  JSON → /${exports.SWAGGER_JSON_ROUTE}`);
}
//# sourceMappingURL=swagger-ui.js.map