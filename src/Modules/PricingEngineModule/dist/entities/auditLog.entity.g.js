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
exports.AuditLog = void 0;
const typeorm_1 = require("typeorm");
let AuditLog = class AuditLog {
};
exports.AuditLog = AuditLog;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ name: 'ID', type: 'uniqueidentifier' }),
    __metadata("design:type", String)
], AuditLog.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ENTITY_NAME', type: 'varchar' }),
    __metadata("design:type", String)
], AuditLog.prototype, "entityName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ENTITY_ID', type: 'varchar' }),
    __metadata("design:type", String)
], AuditLog.prototype, "entityId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ACTION', type: 'varchar' }),
    __metadata("design:type", String)
], AuditLog.prototype, "action", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'USER_ID', type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], AuditLog.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'USER_NAME', type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], AuditLog.prototype, "userName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'USER_GROUP', type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], AuditLog.prototype, "userGroup", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'TIMESTAMP', type: 'datetime' }),
    __metadata("design:type", Date)
], AuditLog.prototype, "timestamp", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'DURATION_MS', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], AuditLog.prototype, "durationMs", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'STATUS_CODE', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], AuditLog.prototype, "statusCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'REQUEST_MODULE', type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], AuditLog.prototype, "requestModule", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'REQUEST_PATH', type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], AuditLog.prototype, "requestPath", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'OLD_VALUES', type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], AuditLog.prototype, "oldValues", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'NEW_VALUES', type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], AuditLog.prototype, "newValues", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'CHANGED_COLUMNS', type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], AuditLog.prototype, "changedColumns", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'IS_CHANGED', type: 'bit', nullable: true }),
    __metadata("design:type", Object)
], AuditLog.prototype, "isChanged", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'CHANGE_SUMMARY', type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], AuditLog.prototype, "changeSummary", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'IP_ADDRESS', type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], AuditLog.prototype, "ipAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'USER_AGENT', type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], AuditLog.prototype, "userAgent", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'CLIENT_ID', type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], AuditLog.prototype, "clientId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'CORRELATION_ID', type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], AuditLog.prototype, "correlationId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'IS_SUCCESS', type: 'bit', nullable: true }),
    __metadata("design:type", Object)
], AuditLog.prototype, "isSuccess", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ERROR_MESSAGE', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], AuditLog.prototype, "errorMessage", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'HASH', type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], AuditLog.prototype, "hash", void 0);
exports.AuditLog = AuditLog = __decorate([
    (0, typeorm_1.Entity)({ name: 'AUDIT_LOGS' })
], AuditLog);
//# sourceMappingURL=auditLog.entity.g.js.map