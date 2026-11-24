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
exports.CommissionRulesController = void 0;
const common_1 = require("@nestjs/common");
const cqrs_1 = require("@nestjs/cqrs");
const swagger_1 = require("@nestjs/swagger");
const commissionRule_dto_g_1 = require("../dto/commissionRule.dto.g");
const commissionRule_getByModelId_response_dto_g_1 = require("../dto/commissionRule.getByModelId.response.dto.g");
const commissionRule_getActiveRulesByModel_response_dto_g_1 = require("../dto/commissionRule.getActiveRulesByModel.response.dto.g");
const commissionRule_deactivate_request_dto_g_1 = require("../dto/commissionRule.deactivate.request.dto.g");
const list_commissionRule_query_g_1 = require("../features/queries/commissionRule/list-commissionRule.query.g");
const get_item_commissionRule_query_g_1 = require("../features/queries/commissionRule/get-item-commissionRule.query.g");
const total_item_count_commissionRule_query_g_1 = require("../features/queries/commissionRule/total-item-count-commissionRule.query.g");
const insert_commissionRule_command_g_1 = require("../features/commands/commissionRule/insert-commissionRule.command.g");
const update_commissionRule_command_g_1 = require("../features/commands/commissionRule/update-commissionRule.command.g");
const delete_item_commissionRule_command_g_1 = require("../features/commands/commissionRule/delete-item-commissionRule.command.g");
const getByModelId_commissionRule_query_g_1 = require("../features/queries/commissionRule/getByModelId-commissionRule.query.g");
const getActiveRulesByModel_commissionRule_query_g_1 = require("../features/queries/commissionRule/getActiveRulesByModel-commissionRule.query.g");
const deactivate_commissionRule_command_g_1 = require("../features/commands/commissionRule/deactivate-commissionRule.command.g");
const common_2 = require("@demo/common");
let CommissionRulesController = class CommissionRulesController {
    constructor(queryBus, commandBus) {
        this.queryBus = queryBus;
        this.commandBus = commandBus;
    }
    async listAsync(page, size, includeCount = false) {
        const r = await this.queryBus.execute(new list_commissionRule_query_g_1.ListCommissionRuleQuery(page, size, includeCount));
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async countAsync() {
        const r = await this.queryBus.execute(new total_item_count_commissionRule_query_g_1.TotalItemCountCommissionRuleQuery());
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async getItemAsync(id) {
        const r = await this.queryBus.execute(new get_item_commissionRule_query_g_1.GetItemCommissionRuleQuery(id));
        if (r.code === 404)
            throw new common_1.NotFoundException(r.message);
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async insertAsync(dto) {
        const r = await this.commandBus.execute(new insert_commissionRule_command_g_1.InsertCommissionRuleCommand(dto));
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async updateAsync(id, dto) {
        const r = await this.commandBus.execute(new update_commissionRule_command_g_1.UpdateCommissionRuleCommand(id, dto));
        if (r.code === 404)
            throw new common_1.NotFoundException(r.message);
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async deleteAsync(id) {
        const r = await this.commandBus.execute(new delete_item_commissionRule_command_g_1.DeleteItemCommissionRuleCommand(id));
        if (r.code === 404)
            throw new common_1.NotFoundException(r.message);
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async getByModelIdAsync(commissionModelId, pageNumber, pageSize) {
        const r = await this.queryBus.execute(new getByModelId_commissionRule_query_g_1.GetByModelIdCommissionRuleQuery(commissionModelId, pageNumber, pageSize));
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async getActiveRulesByModelAsync(commissionModelId, pageNumber, pageSize) {
        const r = await this.queryBus.execute(new getActiveRulesByModel_commissionRule_query_g_1.GetActiveRulesByModelCommissionRuleQuery(commissionModelId, pageNumber, pageSize));
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async deactivateAsync(commissionRuleId, dto) {
        const r = await this.commandBus.execute(new deactivate_commissionRule_command_g_1.DeactivateCommissionRuleCommand(commissionRuleId, dto));
        if (r.code === 404)
            throw new common_1.NotFoundException(r.message);
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
};
exports.CommissionRulesController = CommissionRulesController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ operationId: 'CommissionRulesList' }),
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
], CommissionRulesController.prototype, "listAsync", null);
__decorate([
    (0, common_1.Get)('count'),
    (0, swagger_1.ApiOperation)({ operationId: 'CommissionRulesCount' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CommissionRulesController.prototype, "countAsync", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ operationId: 'CommissionRulesGetItem' }),
    (0, swagger_1.ApiParam)({ name: 'id', required: true, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, type: commissionRule_dto_g_1.CommissionRuleDto }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], CommissionRulesController.prototype, "getItemAsync", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ operationId: 'CommissionRulesInsert' }),
    (0, swagger_1.ApiResponse)({ status: 201, type: commissionRule_dto_g_1.CommissionRuleDto }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [commissionRule_dto_g_1.CommissionRuleDto]),
    __metadata("design:returntype", Promise)
], CommissionRulesController.prototype, "insertAsync", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ operationId: 'CommissionRulesUpdate' }),
    (0, swagger_1.ApiParam)({ name: 'id', required: true, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, type: Boolean }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, commissionRule_dto_g_1.CommissionRuleDto]),
    __metadata("design:returntype", Promise)
], CommissionRulesController.prototype, "updateAsync", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ operationId: 'CommissionRulesDelete' }),
    (0, swagger_1.ApiParam)({ name: 'id', required: true, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, type: Boolean }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], CommissionRulesController.prototype, "deleteAsync", null);
__decorate([
    (0, common_1.Get)('get-by-model-id'),
    (0, swagger_1.ApiOperation)({ operationId: 'CommissionRulesGetByModelId' }),
    (0, swagger_1.ApiQuery)({ name: 'commissionModelId', required: true, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'pageNumber', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'pageSize', required: false, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, type: commissionRule_getByModelId_response_dto_g_1.CommissionRuleGetByModelIdResponseDto, isArray: true }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __param(0, (0, common_1.Query)('commissionModelId')),
    __param(1, (0, common_1.Query)('pageNumber')),
    __param(2, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Number]),
    __metadata("design:returntype", Promise)
], CommissionRulesController.prototype, "getByModelIdAsync", null);
__decorate([
    (0, common_1.Get)('get-active-rules-by-model'),
    (0, swagger_1.ApiOperation)({ operationId: 'CommissionRulesGetActiveRulesByModel' }),
    (0, swagger_1.ApiQuery)({ name: 'commissionModelId', required: true, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'pageNumber', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'pageSize', required: false, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, type: commissionRule_getActiveRulesByModel_response_dto_g_1.CommissionRuleGetActiveRulesByModelResponseDto, isArray: true }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __param(0, (0, common_1.Query)('commissionModelId')),
    __param(1, (0, common_1.Query)('pageNumber')),
    __param(2, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Number]),
    __metadata("design:returntype", Promise)
], CommissionRulesController.prototype, "getActiveRulesByModelAsync", null);
__decorate([
    (0, common_1.Patch)('deactivate/:commissionRuleId'),
    (0, swagger_1.ApiOperation)({ operationId: 'CommissionRulesDeactivate' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __param(0, (0, common_1.Param)('commissionRuleId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, commissionRule_deactivate_request_dto_g_1.CommissionRuleDeactivateRequestDto]),
    __metadata("design:returntype", Promise)
], CommissionRulesController.prototype, "deactivateAsync", null);
exports.CommissionRulesController = CommissionRulesController = __decorate([
    (0, swagger_1.ApiTags)('CommissionRules'),
    (0, swagger_1.ApiBearerAuth)('Bearer'),
    (0, common_1.Controller)('api/pricing-engine-module/commission-rules'),
    __metadata("design:paramtypes", [cqrs_1.QueryBus,
        cqrs_1.CommandBus])
], CommissionRulesController);
//# sourceMappingURL=commissionRule.controller.g.js.map