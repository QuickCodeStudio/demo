import { INestApplication } from '@nestjs/common';
export declare const SWAGGER_UI_ROUTE = "swagger";
export declare const SWAGGER_JSON_ROUTE = "swagger/v1/swagger.json";
export declare const SWAGGER_YAML_ROUTE = "swagger/v1/swagger.yaml";
export declare function isSwaggerPath(path: string): boolean;
export declare function rewriteSwaggerIndexHtmlUrl(url: string): string;
export declare function setupCsharpCompatibleSwagger(app: INestApplication, title: string): void;
