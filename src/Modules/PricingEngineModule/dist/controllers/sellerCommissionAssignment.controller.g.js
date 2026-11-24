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
exports.SellerCommissionAssignmentsController = void 0;
const common_1 = require("@nestjs/common");
const cqrs_1 = require("@nestjs/cqrs");
const swagger_1 = require("@nestjs/swagger");
const sellerCommissionAssignment_dto_g_1 = require("../dto/sellerCommissionAssignment.dto.g");
const sellerCommissionAssignment_getBySellerId_response_dto_g_1 = require("../dto/sellerCommissionAssignment.getBySellerId.response.dto.g");
const sellerCommissionAssignment_getByModelId_response_dto_g_1 = require("../dto/sellerCommissionAssignment.getByModelId.response.dto.g");
const list_sellerCommissionAssignment_query_g_1 = require("../features/queries/sellerCommissionAssignment/list-sellerCommissionAssignment.query.g");
const get_item_sellerCommissionAssignment_query_g_1 = require("../features/queries/sellerCommissionAssignment/get-item-sellerCommissionAssignment.query.g");
const total_item_count_sellerCommissionAssignment_query_g_1 = require("../features/queries/sellerCommissionAssignment/total-item-count-sellerCommissionAssignment.query.g");
const insert_sellerCommissionAssignment_command_g_1 = require("../features/commands/sellerCommissionAssignment/insert-sellerCommissionAssignment.command.g");
const update_sellerCommissionAssignment_command_g_1 = require("../features/commands/sellerCommissionAssignment/update-sellerCommissionAssignment.command.g");
const delete_item_sellerCommissionAssignment_command_g_1 = require("../features/commands/sellerCommissionAssignment/delete-item-sellerCommissionAssignment.command.g");
const getBySellerId_sellerCommissionAssignment_query_g_1 = require("../features/queries/sellerCommissionAssignment/getBySellerId-sellerCommissionAssignment.query.g");
const getByModelId_sellerCommissionAssignment_query_g_1 = require("../features/queries/sellerCommissionAssignment/getByModelId-sellerCommissionAssignment.query.g");
const removeAssignment_sellerCommissionAssignment_command_g_1 = require("../features/commands/sellerCommissionAssignment/removeAssignment-sellerCommissionAssignment.command.g");
const common_2 = require("@demo/common");
let SellerCommissionAssignmentsController = class SellerCommissionAssignmentsController {
    constructor(queryBus, commandBus) {
        this.queryBus = queryBus;
        this.commandBus = commandBus;
    }
    async listAsync(page, size, includeCount = false) {
        const r = await this.queryBus.execute(new list_sellerCommissionAssignment_query_g_1.ListSellerCommissionAssignmentQuery(page, size, includeCount));
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async countAsync() {
        const r = await this.queryBus.execute(new total_item_count_sellerCommissionAssignment_query_g_1.TotalItemCountSellerCommissionAssignmentQuery());
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async getItemAsync(sellerId) {
        const r = await this.queryBus.execute(new get_item_sellerCommissionAssignment_query_g_1.GetItemSellerCommissionAssignmentQuery(sellerId));
        if (r.code === 404)
            throw new common_1.NotFoundException(r.message);
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async insertAsync(dto) {
        const r = await this.commandBus.execute(new insert_sellerCommissionAssignment_command_g_1.InsertSellerCommissionAssignmentCommand(dto));
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async updateAsync(sellerId, dto) {
        const r = await this.commandBus.execute(new update_sellerCommissionAssignment_command_g_1.UpdateSellerCommissionAssignmentCommand(sellerId, dto));
        if (r.code === 404)
            throw new common_1.NotFoundException(r.message);
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async deleteAsync(sellerId) {
        const r = await this.commandBus.execute(new delete_item_sellerCommissionAssignment_command_g_1.DeleteItemSellerCommissionAssignmentCommand(sellerId));
        if (r.code === 404)
            throw new common_1.NotFoundException(r.message);
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async getBySellerIdAsync(sellerId) {
        const r = await this.queryBus.execute(new getBySellerId_sellerCommissionAssignment_query_g_1.GetBySellerIdSellerCommissionAssignmentQuery(sellerId));
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async getByModelIdAsync(commissionModelId, pageNumber, pageSize) {
        const r = await this.queryBus.execute(new getByModelId_sellerCommissionAssignment_query_g_1.GetByModelIdSellerCommissionAssignmentQuery(commissionModelId, pageNumber, pageSize));
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async removeAssignmentAsync(sellerCommissionAssignmentSellerId) {
        const r = await this.commandBus.execute(new removeAssignment_sellerCommissionAssignment_command_g_1.RemoveAssignmentSellerCommissionAssignmentCommand(sellerCommissionAssignmentSellerId));
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
};
exports.SellerCommissionAssignmentsController = SellerCommissionAssignmentsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ operationId: 'SellerCommissionAssignmentsList' }),
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
], SellerCommissionAssignmentsController.prototype, "listAsync", null);
__decorate([
    (0, common_1.Get)('count'),
    (0, swagger_1.ApiOperation)({ operationId: 'SellerCommissionAssignmentsCount' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SellerCommissionAssignmentsController.prototype, "countAsync", null);
__decorate([
    (0, common_1.Get)(':sellerId'),
    (0, swagger_1.ApiOperation)({ operationId: 'SellerCommissionAssignmentsGetItem' }),
    (0, swagger_1.ApiParam)({ name: 'sellerId', required: true, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, type: sellerCommissionAssignment_dto_g_1.SellerCommissionAssignmentDto }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __param(0, (0, common_1.Param)('sellerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], SellerCommissionAssignmentsController.prototype, "getItemAsync", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ operationId: 'SellerCommissionAssignmentsInsert' }),
    (0, swagger_1.ApiResponse)({ status: 201, type: sellerCommissionAssignment_dto_g_1.SellerCommissionAssignmentDto }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [sellerCommissionAssignment_dto_g_1.SellerCommissionAssignmentDto]),
    __metadata("design:returntype", Promise)
], SellerCommissionAssignmentsController.prototype, "insertAsync", null);
__decorate([
    (0, common_1.Put)(':sellerId'),
    (0, swagger_1.ApiOperation)({ operationId: 'SellerCommissionAssignmentsUpdate' }),
    (0, swagger_1.ApiParam)({ name: 'sellerId', required: true, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, type: Boolean }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __param(0, (0, common_1.Param)('sellerId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, sellerCommissionAssignment_dto_g_1.SellerCommissionAssignmentDto]),
    __metadata("design:returntype", Promise)
], SellerCommissionAssignmentsController.prototype, "updateAsync", null);
__decorate([
    (0, common_1.Delete)(':sellerId'),
    (0, swagger_1.ApiOperation)({ operationId: 'SellerCommissionAssignmentsDelete' }),
    (0, swagger_1.ApiParam)({ name: 'sellerId', required: true, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, type: Boolean }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __param(0, (0, common_1.Param)('sellerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], SellerCommissionAssignmentsController.prototype, "deleteAsync", null);
__decorate([
    (0, common_1.Get)('get-by-seller-id'),
    (0, swagger_1.ApiOperation)({ operationId: 'SellerCommissionAssignmentsGetBySellerId' }),
    (0, swagger_1.ApiQuery)({ name: 'sellerId', required: true, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, type: sellerCommissionAssignment_getBySellerId_response_dto_g_1.SellerCommissionAssignmentGetBySellerIdResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __param(0, (0, common_1.Query)('sellerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], SellerCommissionAssignmentsController.prototype, "getBySellerIdAsync", null);
__decorate([
    (0, common_1.Get)('get-by-model-id'),
    (0, swagger_1.ApiOperation)({ operationId: 'SellerCommissionAssignmentsGetByModelId' }),
    (0, swagger_1.ApiQuery)({ name: 'commissionModelId', required: true, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'pageNumber', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'pageSize', required: false, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, type: sellerCommissionAssignment_getByModelId_response_dto_g_1.SellerCommissionAssignmentGetByModelIdResponseDto, isArray: true }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __param(0, (0, common_1.Query)('commissionModelId')),
    __param(1, (0, common_1.Query)('pageNumber')),
    __param(2, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Number]),
    __metadata("design:returntype", Promise)
], SellerCommissionAssignmentsController.prototype, "getByModelIdAsync", null);
__decorate([
    (0, common_1.Delete)('remove-assignment/:sellerCommissionAssignmentSellerId'),
    (0, swagger_1.ApiOperation)({ operationId: 'SellerCommissionAssignmentsRemoveAssignment' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __param(0, (0, common_1.Param)('sellerCommissionAssignmentSellerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], SellerCommissionAssignmentsController.prototype, "removeAssignmentAsync", null);
exports.SellerCommissionAssignmentsController = SellerCommissionAssignmentsController = __decorate([
    (0, swagger_1.ApiTags)('SellerCommissionAssignments'),
    (0, swagger_1.ApiBearerAuth)('Bearer'),
    (0, common_1.Controller)('api/pricing-engine-module/seller-commission-assignments'),
    __metadata("design:paramtypes", [cqrs_1.QueryBus,
        cqrs_1.CommandBus])
], SellerCommissionAssignmentsController);
//# sourceMappingURL=sellerCommissionAssignment.controller.g.js.map