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
exports.AuditLogGetRecentHttpRequestsByModuleResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class AuditLogGetRecentHttpRequestsByModuleResponseDto {
}
exports.AuditLogGetRecentHttpRequestsByModuleResponseDto = AuditLogGetRecentHttpRequestsByModuleResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: String, format: 'uuid' }),
    __metadata("design:type", String)
], AuditLogGetRecentHttpRequestsByModuleResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: String, format: 'date-time' }),
    __metadata("design:type", Date)
], AuditLogGetRecentHttpRequestsByModuleResponseDto.prototype, "timestamp", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: Number, format: 'int32', nullable: true }),
    __metadata("design:type", Number)
], AuditLogGetRecentHttpRequestsByModuleResponseDto.prototype, "durationMs", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: Number, format: 'int32', nullable: true }),
    __metadata("design:type", Number)
], AuditLogGetRecentHttpRequestsByModuleResponseDto.prototype, "statusCode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: String, nullable: true }),
    __metadata("design:type", String)
], AuditLogGetRecentHttpRequestsByModuleResponseDto.prototype, "requestModule", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: String }),
    __metadata("design:type", String)
], AuditLogGetRecentHttpRequestsByModuleResponseDto.prototype, "action", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: String, nullable: true }),
    __metadata("design:type", String)
], AuditLogGetRecentHttpRequestsByModuleResponseDto.prototype, "userGroup", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: Boolean, nullable: true }),
    __metadata("design:type", Boolean)
], AuditLogGetRecentHttpRequestsByModuleResponseDto.prototype, "isSuccess", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: String, nullable: true }),
    __metadata("design:type", String)
], AuditLogGetRecentHttpRequestsByModuleResponseDto.prototype, "errorMessage", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: String, nullable: true }),
    __metadata("design:type", String)
], AuditLogGetRecentHttpRequestsByModuleResponseDto.prototype, "newValues", void 0);
//# sourceMappingURL=auditLog.getRecentHttpRequestsByModule.response.dto.g.js.map