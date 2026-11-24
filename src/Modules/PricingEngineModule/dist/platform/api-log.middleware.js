"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiLogMiddleware = void 0;
const common_1 = require("@nestjs/common");
const security_audit_middleware_1 = require("../auditing/security-audit.middleware");
const elastic_sink_1 = require("./observability/elastic-sink");
let ApiLogMiddleware = class ApiLogMiddleware {
    constructor() {
        this.logger = new common_1.Logger('ApiLog');
    }
    use(req, res, next) {
        const path = req.path || req.url || '';
        if ((0, security_audit_middleware_1.isHealthPath)(path) || path.startsWith('/swagger')) {
            next();
            return;
        }
        const started = Date.now();
        const requestDatetime = new Date().toISOString();
        res.on('finish', () => {
            const apiLog = {
                hostName: path,
                clientIp: req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                    req.ip ||
                    'unknown',
                httpStatusCode: String(res.statusCode),
                elapsedTime: Date.now() - started,
                requestDatetime,
                responseDatetime: new Date().toISOString(),
                method: req.method,
            };
            this.logger.log(`Api Log Message: ${JSON.stringify(apiLog)}`);
            (0, elastic_sink_1.writeElasticLog)({
                message: 'Api Log Message',
                level: 'Information',
                ...apiLog,
            });
        });
        next();
    }
};
exports.ApiLogMiddleware = ApiLogMiddleware;
exports.ApiLogMiddleware = ApiLogMiddleware = __decorate([
    (0, common_1.Injectable)()
], ApiLogMiddleware);
//# sourceMappingURL=api-log.middleware.js.map