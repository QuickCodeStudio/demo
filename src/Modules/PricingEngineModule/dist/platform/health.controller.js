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
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
let HealthController = class HealthController {
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async healthCheck() {
        const started = process.hrtime.bigint();
        const entries = {};
        let healthy = true;
        const dbStarted = process.hrtime.bigint();
        try {
            await this.dataSource.query('SELECT 1');
            entries.database = {
                status: 'Healthy',
                duration: formatDuration(process.hrtime.bigint() - dbStarted),
                data: {},
                tags: ['ready'],
            };
        }
        catch (err) {
            healthy = false;
            entries.database = {
                status: 'Unhealthy',
                duration: formatDuration(process.hrtime.bigint() - dbStarted),
                description: err instanceof Error ? err.message : String(err),
                data: {},
                tags: ['ready'],
            };
        }
        const body = {
            status: healthy ? 'Healthy' : 'Unhealthy',
            totalDuration: formatDuration(process.hrtime.bigint() - started),
            entries,
        };
        if (!healthy) {
            throw new common_1.HttpException(body, common_1.HttpStatus.SERVICE_UNAVAILABLE);
        }
        return body;
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, common_1.Get)('hc'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "healthCheck", null);
exports.HealthController = HealthController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], HealthController);
function formatDuration(ns) {
    const totalNs = Number(ns);
    const totalSec = Math.floor(totalNs / 1e9);
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    const fracTicks = Math.floor((totalNs % 1e9) / 100);
    const frac = String(fracTicks).padStart(7, '0').slice(0, 7);
    return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}.${frac}`;
}
function pad2(n) {
    return String(n).padStart(2, '0');
}
//# sourceMappingURL=health.controller.js.map