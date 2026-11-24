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
exports.CommissionModelsController = void 0;
const common_1 = require("@nestjs/common");
const cqrs_1 = require("@nestjs/cqrs");
const swagger_1 = require("@nestjs/swagger");
const commissionModel_dto_g_1 = require("../dto/commissionModel.dto.g");
const commissionModel_getActive_response_dto_g_1 = require("../dto/commissionModel.getActive.response.dto.g");
const commissionModel_getByName_response_dto_g_1 = require("../dto/commissionModel.getByName.response.dto.g");
const commissionModel_deactivate_request_dto_g_1 = require("../dto/commissionModel.deactivate.request.dto.g");
const list_commissionModel_query_g_1 = require("../features/queries/commissionModel/list-commissionModel.query.g");
const get_item_commissionModel_query_g_1 = require("../features/queries/commissionModel/get-item-commissionModel.query.g");
const total_item_count_commissionModel_query_g_1 = require("../features/queries/commissionModel/total-item-count-commissionModel.query.g");
const insert_commissionModel_command_g_1 = require("../features/commands/commissionModel/insert-commissionModel.command.g");
const update_commissionModel_command_g_1 = require("../features/commands/commissionModel/update-commissionModel.command.g");
const delete_item_commissionModel_command_g_1 = require("../features/commands/commissionModel/delete-item-commissionModel.command.g");
const getActive_commissionModel_query_g_1 = require("../features/queries/commissionModel/getActive-commissionModel.query.g");
const getByName_commissionModel_query_g_1 = require("../features/queries/commissionModel/getByName-commissionModel.query.g");
const deactivate_commissionModel_command_g_1 = require("../features/commands/commissionModel/deactivate-commissionModel.command.g");
const common_2 = require("@demo/common");
let CommissionModelsController = class CommissionModelsController {
    constructor(queryBus, commandBus) {
        this.queryBus = queryBus;
        this.commandBus = commandBus;
    }
    async listAsync(page, size, includeCount = false) {
        const r = await this.queryBus.execute(new list_commissionModel_query_g_1.ListCommissionModelQuery(page, size, includeCount));
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async countAsync() {
        const r = await this.queryBus.execute(new total_item_count_commissionModel_query_g_1.TotalItemCountCommissionModelQuery());
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async getItemAsync(id) {
        const r = await this.queryBus.execute(new get_item_commissionModel_query_g_1.GetItemCommissionModelQuery(id));
        if (r.code === 404)
            throw new common_1.NotFoundException(r.message);
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async insertAsync(dto) {
        const r = await this.commandBus.execute(new insert_commissionModel_command_g_1.InsertCommissionModelCommand(dto));
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async updateAsync(id, dto) {
        const r = await this.commandBus.execute(new update_commissionModel_command_g_1.UpdateCommissionModelCommand(id, dto));
        if (r.code === 404)
            throw new common_1.NotFoundException(r.message);
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async deleteAsync(id) {
        const r = await this.commandBus.execute(new delete_item_commissionModel_command_g_1.DeleteItemCommissionModelCommand(id));
        if (r.code === 404)
            throw new common_1.NotFoundException(r.message);
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async getActiveAsync(pageNumber, pageSize) {
        const r = await this.queryBus.execute(new getActive_commissionModel_query_g_1.GetActiveCommissionModelQuery(pageNumber, pageSize));
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async getByNameAsync(name) {
        const r = await this.queryBus.execute(new getByName_commissionModel_query_g_1.GetByNameCommissionModelQuery(name));
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async deactivateAsync(commissionModelId, dto) {
        const r = await this.commandBus.execute(new deactivate_commissionModel_command_g_1.DeactivateCommissionModelCommand(commissionModelId, dto));
        if (r.code === 404)
            throw new common_1.NotFoundException(r.message);
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
};
exports.CommissionModelsController = CommissionModelsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ operationId: 'CommissionModelsList' }),
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
], CommissionModelsController.prototype, "listAsync", null);
__decorate([
    (0, common_1.Get)('count'),
    (0, swagger_1.ApiOperation)({ operationId: 'CommissionModelsCount' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CommissionModelsController.prototype, "countAsync", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ operationId: 'CommissionModelsGetItem' }),
    (0, swagger_1.ApiParam)({ name: 'id', required: true, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, type: commissionModel_dto_g_1.CommissionModelDto }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], CommissionModelsController.prototype, "getItemAsync", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ operationId: 'CommissionModelsInsert' }),
    (0, swagger_1.ApiResponse)({ status: 201, type: commissionModel_dto_g_1.CommissionModelDto }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [commissionModel_dto_g_1.CommissionModelDto]),
    __metadata("design:returntype", Promise)
], CommissionModelsController.prototype, "insertAsync", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ operationId: 'CommissionModelsUpdate' }),
    (0, swagger_1.ApiParam)({ name: 'id', required: true, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, type: Boolean }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, commissionModel_dto_g_1.CommissionModelDto]),
    __metadata("design:returntype", Promise)
], CommissionModelsController.prototype, "updateAsync", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ operationId: 'CommissionModelsDelete' }),
    (0, swagger_1.ApiParam)({ name: 'id', required: true, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, type: Boolean }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], CommissionModelsController.prototype, "deleteAsync", null);
__decorate([
    (0, common_1.Get)('get-active'),
    (0, swagger_1.ApiOperation)({ operationId: 'CommissionModelsGetActive' }),
    (0, swagger_1.ApiQuery)({ name: 'pageNumber', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'pageSize', required: false, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, type: commissionModel_getActive_response_dto_g_1.CommissionModelGetActiveResponseDto, isArray: true }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __param(0, (0, common_1.Query)('pageNumber')),
    __param(1, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", Promise)
], CommissionModelsController.prototype, "getActiveAsync", null);
__decorate([
    (0, common_1.Get)('get-by-name'),
    (0, swagger_1.ApiOperation)({ operationId: 'CommissionModelsGetByName' }),
    (0, swagger_1.ApiQuery)({ name: 'name', required: true, type: String }),
    (0, swagger_1.ApiResponse)({ status: 200, type: commissionModel_getByName_response_dto_g_1.CommissionModelGetByNameResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __param(0, (0, common_1.Query)('name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CommissionModelsController.prototype, "getByNameAsync", null);
__decorate([
    (0, common_1.Patch)('deactivate/:commissionModelId'),
    (0, swagger_1.ApiOperation)({ operationId: 'CommissionModelsDeactivate' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __param(0, (0, common_1.Param)('commissionModelId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, commissionModel_deactivate_request_dto_g_1.CommissionModelDeactivateRequestDto]),
    __metadata("design:returntype", Promise)
], CommissionModelsController.prototype, "deactivateAsync", null);
exports.CommissionModelsController = CommissionModelsController = __decorate([
    (0, swagger_1.ApiTags)('CommissionModels'),
    (0, swagger_1.ApiBearerAuth)('Bearer'),
    (0, common_1.Controller)('api/pricing-engine-module/commission-models'),
    __metadata("design:paramtypes", [cqrs_1.QueryBus,
        cqrs_1.CommandBus])
], CommissionModelsController);
//# sourceMappingURL=commissionModel.controller.g.js.map