"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var GlobalExceptionFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const elastic_sink_1 = require("./observability/elastic-sink");
let GlobalExceptionFilter = GlobalExceptionFilter_1 = class GlobalExceptionFilter {
    constructor() {
        this.logger = new common_1.Logger(GlobalExceptionFilter_1.name);
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const res = ctx.getResponse();
        if (exception instanceof common_1.HttpException) {
            const status = exception.getStatus();
            const body = exception.getResponse();
            res.status(status);
            if (typeof body === 'string') {
                res.type('application/problem+json').json({
                    status,
                    title: body,
                });
                return;
            }
            res.type('application/json').json(body);
            return;
        }
        this.logger.error('Unhandled exception occurred', exception instanceof Error ? exception.stack : String(exception));
        (0, elastic_sink_1.writeElasticLog)({
            message: 'Unhandled exception occurred',
            level: 'Error',
            exception: exception instanceof Error
                ? { message: exception.message, stack: exception.stack }
                : String(exception),
        });
        const isDev = (process.env.NODE_ENV ?? '').toLowerCase() === 'development';
        res.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).type('application/problem+json').json({
            status: 500,
            title: 'An unexpected error occurred.',
            detail: isDev
                ? exception instanceof Error
                    ? exception.stack ?? exception.message
                    : String(exception)
                : 'Please contact support.',
        });
    }
};
exports.GlobalExceptionFilter = GlobalExceptionFilter;
exports.GlobalExceptionFilter = GlobalExceptionFilter = GlobalExceptionFilter_1 = __decorate([
    (0, common_1.Catch)()
], GlobalExceptionFilter);
//# sourceMappingURL=global-exception.filter.js.map