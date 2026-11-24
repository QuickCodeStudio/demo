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
exports.CampaignApplicabilityGetByCampaignIdResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const ruleScope_enum_g_1 = require("../enums/ruleScope.enum.g");
class CampaignApplicabilityGetByCampaignIdResponseDto {
}
exports.CampaignApplicabilityGetByCampaignIdResponseDto = CampaignApplicabilityGetByCampaignIdResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ruleScope_enum_g_1.RuleScope, enumName: 'QuickCode.Demo.PricingEngineModule.Domain.Enums.RuleScope' }),
    __metadata("design:type", String)
], CampaignApplicabilityGetByCampaignIdResponseDto.prototype, "scope", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: Number, format: 'int32' }),
    __metadata("design:type", Number)
], CampaignApplicabilityGetByCampaignIdResponseDto.prototype, "scopeId", void 0);
//# sourceMappingURL=campaignApplicability.getByCampaignId.response.dto.g.js.map