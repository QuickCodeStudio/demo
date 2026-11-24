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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignApplicabilitiesController = void 0;
const common_1 = require("@nestjs/common");
const cqrs_1 = require("@nestjs/cqrs");
const swagger_1 = require("@nestjs/swagger");
const campaignApplicability_dto_g_1 = require("../dto/campaignApplicability.dto.g");
const campaignApplicability_getByCampaignId_response_dto_g_1 = require("../dto/campaignApplicability.getByCampaignId.response.dto.g");
const list_campaignApplicability_query_g_1 = require("../features/queries/campaignApplicability/list-campaignApplicability.query.g");
const get_item_campaignApplicability_query_g_1 = require("../features/queries/campaignApplicability/get-item-campaignApplicability.query.g");
const total_item_count_campaignApplicability_query_g_1 = require("../features/queries/campaignApplicability/total-item-count-campaignApplicability.query.g");
const insert_campaignApplicability_command_g_1 = require("../features/commands/campaignApplicability/insert-campaignApplicability.command.g");
const update_campaignApplicability_command_g_1 = require("../features/commands/campaignApplicability/update-campaignApplicability.command.g");
const delete_item_campaignApplicability_command_g_1 = require("../features/commands/campaignApplicability/delete-item-campaignApplicability.command.g");
const getByCampaignId_campaignApplicability_query_g_1 = require("../features/queries/campaignApplicability/getByCampaignId-campaignApplicability.query.g");
const removeApplicability_campaignApplicability_command_g_1 = require("../features/commands/campaignApplicability/removeApplicability-campaignApplicability.command.g");
const common_2 = require("@demo/common");
const ruleScope_enum_g_1 = require("../enums/ruleScope.enum.g");
let CampaignApplicabilitiesController = class CampaignApplicabilitiesController {
    constructor(queryBus, commandBus) {
        this.queryBus = queryBus;
        this.commandBus = commandBus;
    }
    async listAsync(page, size, includeCount = false) {
        const r = await this.queryBus.execute(new list_campaignApplicability_query_g_1.ListCampaignApplicabilityQuery(page, size, includeCount));
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async countAsync() {
        const r = await this.queryBus.execute(new total_item_count_campaignApplicability_query_g_1.TotalItemCountCampaignApplicabilityQuery());
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async getItemAsync(campaignId, scope, scopeId) {
        const r = await this.queryBus.execute(new get_item_campaignApplicability_query_g_1.GetItemCampaignApplicabilityQuery(campaignId, scope, scopeId));
        if (r.code === 404)
            throw new common_1.NotFoundException(r.message);
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async insertAsync(dto) {
        const r = await this.commandBus.execute(new insert_campaignApplicability_command_g_1.InsertCampaignApplicabilityCommand(dto));
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async updateAsync(campaignId, scope, scopeId, dto) {
        const r = await this.commandBus.execute(new update_campaignApplicability_command_g_1.UpdateCampaignApplicabilityCommand(campaignId, scope, scopeId, dto));
        if (r.code === 404)
            throw new common_1.NotFoundException(r.message);
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async deleteAsync(campaignId, scope, scopeId) {
        const r = await this.commandBus.execute(new delete_item_campaignApplicability_command_g_1.DeleteItemCampaignApplicabilityCommand(campaignId, scope, scopeId));
        if (r.code === 404)
            throw new common_1.NotFoundException(r.message);
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async getByCampaignIdAsync(campaignId) {
        const r = await this.queryBus.execute(new getByCampaignId_campaignApplicability_query_g_1.GetByCampaignIdCampaignApplicabilityQuery(campaignId));
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async removeApplicabilityAsync(campaignApplicabilityCampaignId, campaignApplicabilityScope, campaignApplicabilityScopeId) {
        const r = await this.commandBus.execute(new removeApplicability_campaignApplicability_command_g_1.RemoveApplicabilityCampaignApplicabilityCommand(campaignApplicabilityCampaignId, campaignApplicabilityScope, campaignApplicabilityScopeId));
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
};
exports.CampaignApplicabilitiesController = CampaignApplicabilitiesController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ operationId: 'CampaignApplicabilitiesList' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'size', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'includeCount', required: false, type: Boolean }),
    (0, swagger_1.ApiResponse)({ status: 200, type: common_2.ListResult }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('size')),
    __param(2, (0, common_1.Query)('includeCount')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Object]),
    __metadata("design:returntype", Promise)
], CampaignApplicabilitiesController.prototype, "listAsync", null);
__decorate([
    (0, common_1.Get)('count'),
    (0, swagger_1.ApiOperation)({ operationId: 'CampaignApplicabilitiesCount' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CampaignApplicabilitiesController.prototype, "countAsync", null);
__decorate([
    (0, common_1.Get)(':campaignId/:scope/:scopeId'),
    (0, swagger_1.ApiOperation)({ operationId: 'CampaignApplicabilitiesGetItem' }),
    (0, swagger_1.ApiParam)({ name: 'campaignId', required: true, type: Number }),
    (0, swagger_1.ApiParam)({ name: 'scope', required: true, enum: ruleScope_enum_g_1.RuleScope, enumName: 'QuickCode.Demo.PricingEngineModule.Domain.Enums.RuleScope' }),
    (0, swagger_1.ApiParam)({ name: 'scopeId', required: true, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, type: campaignApplicability_dto_g_1.CampaignApplicabilityDto }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __param(0, (0, common_1.Param)('campaignId')),
    __param(1, (0, common_1.Param)('scope')),
    __param(2, (0, common_1.Param)('scopeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, Number]),
    __metadata("design:returntype", Promise)
], CampaignApplicabilitiesController.prototype, "getItemAsync", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ operationId: 'CampaignApplicabilitiesInsert' }),
    (0, swagger_1.ApiResponse)({ status: 201, type: campaignApplicability_dto_g_1.CampaignApplicabilityDto }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [campaignApplicability_dto_g_1.CampaignApplicabilityDto]),
    __metadata("design:returntype", Promise)
], CampaignApplicabilitiesController.prototype, "insertAsync", null);
__decorate([
    (0, common_1.Put)(':campaignId/:scope/:scopeId'),
    (0, swagger_1.ApiOperation)({ operationId: 'CampaignApplicabilitiesUpdate' }),
    (0, swagger_1.ApiParam)({ name: 'campaignId', required: true, type: Number }),
    (0, swagger_1.ApiParam)({ name: 'scope', required: true, enum: ruleScope_enum_g_1.RuleScope, enumName: 'QuickCode.Demo.PricingEngineModule.Domain.Enums.RuleScope' }),
    (0, swagger_1.ApiParam)({ name: 'scopeId', required: true, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, type: Boolean }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __param(0, (0, common_1.Param)('campaignId')),
    __param(1, (0, common_1.Param)('scope')),
    __param(2, (0, common_1.Param)('scopeId')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, Number, campaignApplicability_dto_g_1.CampaignApplicabilityDto]),
    __metadata("design:returntype", Promise)
], CampaignApplicabilitiesController.prototype, "updateAsync", null);
__decorate([
    (0, common_1.Delete)(':campaignId/:scope/:scopeId'),
    (0, swagger_1.ApiOperation)({ operationId: 'CampaignApplicabilitiesDelete' }),
    (0, swagger_1.ApiParam)({ name: 'campaignId', required: true, type: Number }),
    (0, swagger_1.ApiParam)({ name: 'scope', required: true, enum: ruleScope_enum_g_1.RuleScope, enumName: 'QuickCode.Demo.PricingEngineModule.Domain.Enums.RuleScope' }),
    (0, swagger_1.ApiParam)({ name: 'scopeId', required: true, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, type: Boolean }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __param(0, (0, common_1.Param)('campaignId')),
    __param(1, (0, common_1.Param)('scope')),
    __param(2, (0, common_1.Param)('scopeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, Number]),
    __metadata("design:returntype", Promise)
], CampaignApplicabilitiesController.prototype, "deleteAsync", null);
__decorate([
    (0, common_1.Get)('get-by-campaign-id'),
    (0, swagger_1.ApiOperation)({ operationId: 'CampaignApplicabilitiesGetByCampaignId' }),
    (0, swagger_1.ApiQuery)({ name: 'campaignId', required: true, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, type: campaignApplicability_getByCampaignId_response_dto_g_1.CampaignApplicabilityGetByCampaignIdResponseDto, isArray: true }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __param(0, (0, common_1.Query)('campaignId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], CampaignApplicabilitiesController.prototype, "getByCampaignIdAsync", null);
__decorate([
    (0, common_1.Delete)('remove-applicability/:campaignApplicabilityCampaignId/:campaignApplicabilityScope/:campaignApplicabilityScopeId'),
    (0, swagger_1.ApiOperation)({ operationId: 'CampaignApplicabilitiesRemoveApplicability' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __param(0, (0, common_1.Param)('campaignApplicabilityCampaignId')),
    __param(1, (0, common_1.Param)('campaignApplicabilityScope')),
    __param(2, (0, common_1.Param)('campaignApplicabilityScopeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, Number]),
    __metadata("design:returntype", Promise)
], CampaignApplicabilitiesController.prototype, "removeApplicabilityAsync", null);
exports.CampaignApplicabilitiesController = CampaignApplicabilitiesController = __decorate([
    (0, swagger_1.ApiTags)('CampaignApplicabilities'),
    (0, swagger_1.ApiBearerAuth)('Bearer'),
    (0, common_1.Controller)('api/pricing-engine-module/campaign-applicabilities'),
    __metadata("design:paramtypes", [cqrs_1.QueryBus,
        cqrs_1.CommandBus])
], CampaignApplicabilitiesController);
//# sourceMappingURL=campaignApplicability.controller.g.js.map