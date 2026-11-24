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
exports.FilterCommissionRuleDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const ruleScope_enum_g_1 = require("../enums/ruleScope.enum.g");
const commissionType_enum_g_1 = require("../enums/commissionType.enum.g");
class FilterCommissionRuleDto {
}
exports.FilterCommissionRuleDto = FilterCommissionRuleDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: Number, format: 'int32', nullable: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], FilterCommissionRuleDto.prototype, "commissionModelId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ruleScope_enum_g_1.RuleScope, enumName: 'QuickCode.Demo.PricingEngineModule.Domain.Enums.RuleScope', nullable: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], FilterCommissionRuleDto.prototype, "scope", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: Number, format: 'int32', nullable: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], FilterCommissionRuleDto.prototype, "scopeId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: commissionType_enum_g_1.CommissionType, enumName: 'QuickCode.Demo.PricingEngineModule.Domain.Enums.CommissionType', nullable: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], FilterCommissionRuleDto.prototype, "commissionType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: Number, format: 'double', nullable: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], FilterCommissionRuleDto.prototype, "percentageRate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: Number, format: 'double', nullable: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], FilterCommissionRuleDto.prototype, "fixedAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: Boolean, nullable: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], FilterCommissionRuleDto.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ minimum: 1 }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], FilterCommissionRuleDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ minimum: 1 }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], FilterCommissionRuleDto.prototype, "size", void 0);
//# sourceMappingURL=filter-commissionRule.dto.g.js.map