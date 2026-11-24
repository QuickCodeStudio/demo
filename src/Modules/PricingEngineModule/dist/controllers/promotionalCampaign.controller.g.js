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
exports.PromotionalCampaignsController = void 0;
const common_1 = require("@nestjs/common");
const cqrs_1 = require("@nestjs/cqrs");
const swagger_1 = require("@nestjs/swagger");
const promotionalCampaign_dto_g_1 = require("../dto/promotionalCampaign.dto.g");
const promotionalCampaign_getActiveCampaigns_response_dto_g_1 = require("../dto/promotionalCampaign.getActiveCampaigns.response.dto.g");
const promotionalCampaign_getCampaignsInDateRange_response_dto_g_1 = require("../dto/promotionalCampaign.getCampaignsInDateRange.response.dto.g");
const promotionalCampaign_deactivate_request_dto_g_1 = require("../dto/promotionalCampaign.deactivate.request.dto.g");
const list_promotionalCampaign_query_g_1 = require("../features/queries/promotionalCampaign/list-promotionalCampaign.query.g");
const get_item_promotionalCampaign_query_g_1 = require("../features/queries/promotionalCampaign/get-item-promotionalCampaign.query.g");
const total_item_count_promotionalCampaign_query_g_1 = require("../features/queries/promotionalCampaign/total-item-count-promotionalCampaign.query.g");
const insert_promotionalCampaign_command_g_1 = require("../features/commands/promotionalCampaign/insert-promotionalCampaign.command.g");
const update_promotionalCampaign_command_g_1 = require("../features/commands/promotionalCampaign/update-promotionalCampaign.command.g");
const delete_item_promotionalCampaign_command_g_1 = require("../features/commands/promotionalCampaign/delete-item-promotionalCampaign.command.g");
const getActiveCampaigns_promotionalCampaign_query_g_1 = require("../features/queries/promotionalCampaign/getActiveCampaigns-promotionalCampaign.query.g");
const getCampaignsInDateRange_promotionalCampaign_query_g_1 = require("../features/queries/promotionalCampaign/getCampaignsInDateRange-promotionalCampaign.query.g");
const deactivate_promotionalCampaign_command_g_1 = require("../features/commands/promotionalCampaign/deactivate-promotionalCampaign.command.g");
const common_2 = require("@demo/common");
let PromotionalCampaignsController = class PromotionalCampaignsController {
    constructor(queryBus, commandBus) {
        this.queryBus = queryBus;
        this.commandBus = commandBus;
    }
    async listAsync(page, size, includeCount = false) {
        const r = await this.queryBus.execute(new list_promotionalCampaign_query_g_1.ListPromotionalCampaignQuery(page, size, includeCount));
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async countAsync() {
        const r = await this.queryBus.execute(new total_item_count_promotionalCampaign_query_g_1.TotalItemCountPromotionalCampaignQuery());
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async getItemAsync(id) {
        const r = await this.queryBus.execute(new get_item_promotionalCampaign_query_g_1.GetItemPromotionalCampaignQuery(id));
        if (r.code === 404)
            throw new common_1.NotFoundException(r.message);
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async insertAsync(dto) {
        const r = await this.commandBus.execute(new insert_promotionalCampaign_command_g_1.InsertPromotionalCampaignCommand(dto));
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async updateAsync(id, dto) {
        const r = await this.commandBus.execute(new update_promotionalCampaign_command_g_1.UpdatePromotionalCampaignCommand(id, dto));
        if (r.code === 404)
            throw new common_1.NotFoundException(r.message);
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async deleteAsync(id) {
        const r = await this.commandBus.execute(new delete_item_promotionalCampaign_command_g_1.DeleteItemPromotionalCampaignCommand(id));
        if (r.code === 404)
            throw new common_1.NotFoundException(r.message);
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async getActiveCampaignsAsync(pageNumber, pageSize) {
        const r = await this.queryBus.execute(new getActiveCampaigns_promotionalCampaign_query_g_1.GetActiveCampaignsPromotionalCampaignQuery(pageNumber, pageSize));
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async getCampaignsInDateRangeAsync(startDate_From, startDate_To, pageNumber, pageSize) {
        const r = await this.queryBus.execute(new getCampaignsInDateRange_promotionalCampaign_query_g_1.GetCampaignsInDateRangePromotionalCampaignQuery(startDate_From, startDate_To, pageNumber, pageSize));
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async deactivateAsync(promotionalCampaignId, dto) {
        const r = await this.commandBus.execute(new deactivate_promotionalCampaign_command_g_1.DeactivatePromotionalCampaignCommand(promotionalCampaignId, dto));
        if (r.code === 404)
            throw new common_1.NotFoundException(r.message);
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
};
exports.PromotionalCampaignsController = PromotionalCampaignsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ operationId: 'PromotionalCampaignsList' }),
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
], PromotionalCampaignsController.prototype, "listAsync", null);
__decorate([
    (0, common_1.Get)('count'),
    (0, swagger_1.ApiOperation)({ operationId: 'PromotionalCampaignsCount' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PromotionalCampaignsController.prototype, "countAsync", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ operationId: 'PromotionalCampaignsGetItem' }),
    (0, swagger_1.ApiParam)({ name: 'id', required: true, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, type: promotionalCampaign_dto_g_1.PromotionalCampaignDto }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], PromotionalCampaignsController.prototype, "getItemAsync", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ operationId: 'PromotionalCampaignsInsert' }),
    (0, swagger_1.ApiResponse)({ status: 201, type: promotionalCampaign_dto_g_1.PromotionalCampaignDto }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [promotionalCampaign_dto_g_1.PromotionalCampaignDto]),
    __metadata("design:returntype", Promise)
], PromotionalCampaignsController.prototype, "insertAsync", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ operationId: 'PromotionalCampaignsUpdate' }),
    (0, swagger_1.ApiParam)({ name: 'id', required: true, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, type: Boolean }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, promotionalCampaign_dto_g_1.PromotionalCampaignDto]),
    __metadata("design:returntype", Promise)
], PromotionalCampaignsController.prototype, "updateAsync", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ operationId: 'PromotionalCampaignsDelete' }),
    (0, swagger_1.ApiParam)({ name: 'id', required: true, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, type: Boolean }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], PromotionalCampaignsController.prototype, "deleteAsync", null);
__decorate([
    (0, common_1.Get)('get-active-campaigns'),
    (0, swagger_1.ApiOperation)({ operationId: 'PromotionalCampaignsGetActiveCampaigns' }),
    (0, swagger_1.ApiQuery)({ name: 'pageNumber', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'pageSize', required: false, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, type: promotionalCampaign_getActiveCampaigns_response_dto_g_1.PromotionalCampaignGetActiveCampaignsResponseDto, isArray: true }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __param(0, (0, common_1.Query)('pageNumber')),
    __param(1, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", Promise)
], PromotionalCampaignsController.prototype, "getActiveCampaignsAsync", null);
__decorate([
    (0, common_1.Get)('get-campaigns-in-date-range'),
    (0, swagger_1.ApiOperation)({ operationId: 'PromotionalCampaignsGetCampaignsInDateRange' }),
    (0, swagger_1.ApiQuery)({ name: 'startDate_From', required: true, type: Date }),
    (0, swagger_1.ApiQuery)({ name: 'startDate_To', required: true, type: Date }),
    (0, swagger_1.ApiQuery)({ name: 'pageNumber', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'pageSize', required: false, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, type: promotionalCampaign_getCampaignsInDateRange_response_dto_g_1.PromotionalCampaignGetCampaignsInDateRangeResponseDto, isArray: true }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __param(0, (0, common_1.Query)('startDate_From')),
    __param(1, (0, common_1.Query)('startDate_To')),
    __param(2, (0, common_1.Query)('pageNumber')),
    __param(3, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Date, Date, Number, Number]),
    __metadata("design:returntype", Promise)
], PromotionalCampaignsController.prototype, "getCampaignsInDateRangeAsync", null);
__decorate([
    (0, common_1.Patch)('deactivate/:promotionalCampaignId'),
    (0, swagger_1.ApiOperation)({ operationId: 'PromotionalCampaignsDeactivate' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __param(0, (0, common_1.Param)('promotionalCampaignId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, promotionalCampaign_deactivate_request_dto_g_1.PromotionalCampaignDeactivateRequestDto]),
    __metadata("design:returntype", Promise)
], PromotionalCampaignsController.prototype, "deactivateAsync", null);
exports.PromotionalCampaignsController = PromotionalCampaignsController = __decorate([
    (0, swagger_1.ApiTags)('PromotionalCampaigns'),
    (0, swagger_1.ApiBearerAuth)('Bearer'),
    (0, common_1.Controller)('api/pricing-engine-module/promotional-campaigns'),
    __metadata("design:paramtypes", [cqrs_1.QueryBus,
        cqrs_1.CommandBus])
], PromotionalCampaignsController);
//# sourceMappingURL=promotionalCampaign.controller.g.js.map