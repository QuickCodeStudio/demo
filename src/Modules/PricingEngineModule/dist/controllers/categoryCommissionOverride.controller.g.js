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
exports.CategoryCommissionOverridesController = void 0;
const common_1 = require("@nestjs/common");
const cqrs_1 = require("@nestjs/cqrs");
const swagger_1 = require("@nestjs/swagger");
const categoryCommissionOverride_dto_g_1 = require("../dto/categoryCommissionOverride.dto.g");
const categoryCommissionOverride_getByCategoryId_response_dto_g_1 = require("../dto/categoryCommissionOverride.getByCategoryId.response.dto.g");
const list_categoryCommissionOverride_query_g_1 = require("../features/queries/categoryCommissionOverride/list-categoryCommissionOverride.query.g");
const get_item_categoryCommissionOverride_query_g_1 = require("../features/queries/categoryCommissionOverride/get-item-categoryCommissionOverride.query.g");
const total_item_count_categoryCommissionOverride_query_g_1 = require("../features/queries/categoryCommissionOverride/total-item-count-categoryCommissionOverride.query.g");
const insert_categoryCommissionOverride_command_g_1 = require("../features/commands/categoryCommissionOverride/insert-categoryCommissionOverride.command.g");
const update_categoryCommissionOverride_command_g_1 = require("../features/commands/categoryCommissionOverride/update-categoryCommissionOverride.command.g");
const delete_item_categoryCommissionOverride_command_g_1 = require("../features/commands/categoryCommissionOverride/delete-item-categoryCommissionOverride.command.g");
const getByCategoryId_categoryCommissionOverride_query_g_1 = require("../features/queries/categoryCommissionOverride/getByCategoryId-categoryCommissionOverride.query.g");
const removeOverride_categoryCommissionOverride_command_g_1 = require("../features/commands/categoryCommissionOverride/removeOverride-categoryCommissionOverride.command.g");
const common_2 = require("@demo/common");
let CategoryCommissionOverridesController = class CategoryCommissionOverridesController {
    constructor(queryBus, commandBus) {
        this.queryBus = queryBus;
        this.commandBus = commandBus;
    }
    async listAsync(page, size, includeCount = false) {
        const r = await this.queryBus.execute(new list_categoryCommissionOverride_query_g_1.ListCategoryCommissionOverrideQuery(page, size, includeCount));
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async countAsync() {
        const r = await this.queryBus.execute(new total_item_count_categoryCommissionOverride_query_g_1.TotalItemCountCategoryCommissionOverrideQuery());
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async getItemAsync(id) {
        const r = await this.queryBus.execute(new get_item_categoryCommissionOverride_query_g_1.GetItemCategoryCommissionOverrideQuery(id));
        if (r.code === 404)
            throw new common_1.NotFoundException(r.message);
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async insertAsync(dto) {
        const r = await this.commandBus.execute(new insert_categoryCommissionOverride_command_g_1.InsertCategoryCommissionOverrideCommand(dto));
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async updateAsync(id, dto) {
        const r = await this.commandBus.execute(new update_categoryCommissionOverride_command_g_1.UpdateCategoryCommissionOverrideCommand(id, dto));
        if (r.code === 404)
            throw new common_1.NotFoundException(r.message);
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async deleteAsync(id) {
        const r = await this.commandBus.execute(new delete_item_categoryCommissionOverride_command_g_1.DeleteItemCategoryCommissionOverrideCommand(id));
        if (r.code === 404)
            throw new common_1.NotFoundException(r.message);
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async getByCategoryIdAsync(categoryId) {
        const r = await this.queryBus.execute(new getByCategoryId_categoryCommissionOverride_query_g_1.GetByCategoryIdCategoryCommissionOverrideQuery(categoryId));
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async removeOverrideAsync(categoryCommissionOverrideId) {
        const r = await this.commandBus.execute(new removeOverride_categoryCommissionOverride_command_g_1.RemoveOverrideCategoryCommissionOverrideCommand(categoryCommissionOverrideId));
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
};
exports.CategoryCommissionOverridesController = CategoryCommissionOverridesController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ operationId: 'CategoryCommissionOverridesList' }),
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
], CategoryCommissionOverridesController.prototype, "listAsync", null);
__decorate([
    (0, common_1.Get)('count'),
    (0, swagger_1.ApiOperation)({ operationId: 'CategoryCommissionOverridesCount' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CategoryCommissionOverridesController.prototype, "countAsync", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ operationId: 'CategoryCommissionOverridesGetItem' }),
    (0, swagger_1.ApiParam)({ name: 'id', required: true, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, type: categoryCommissionOverride_dto_g_1.CategoryCommissionOverrideDto }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], CategoryCommissionOverridesController.prototype, "getItemAsync", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ operationId: 'CategoryCommissionOverridesInsert' }),
    (0, swagger_1.ApiResponse)({ status: 201, type: categoryCommissionOverride_dto_g_1.CategoryCommissionOverrideDto }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [categoryCommissionOverride_dto_g_1.CategoryCommissionOverrideDto]),
    __metadata("design:returntype", Promise)
], CategoryCommissionOverridesController.prototype, "insertAsync", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ operationId: 'CategoryCommissionOverridesUpdate' }),
    (0, swagger_1.ApiParam)({ name: 'id', required: true, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, type: Boolean }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, categoryCommissionOverride_dto_g_1.CategoryCommissionOverrideDto]),
    __metadata("design:returntype", Promise)
], CategoryCommissionOverridesController.prototype, "updateAsync", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ operationId: 'CategoryCommissionOverridesDelete' }),
    (0, swagger_1.ApiParam)({ name: 'id', required: true, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, type: Boolean }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], CategoryCommissionOverridesController.prototype, "deleteAsync", null);
__decorate([
    (0, common_1.Get)('get-by-category-id'),
    (0, swagger_1.ApiOperation)({ operationId: 'CategoryCommissionOverridesGetByCategoryId' }),
    (0, swagger_1.ApiQuery)({ name: 'categoryId', required: true, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, type: categoryCommissionOverride_getByCategoryId_response_dto_g_1.CategoryCommissionOverrideGetByCategoryIdResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __param(0, (0, common_1.Query)('categoryId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], CategoryCommissionOverridesController.prototype, "getByCategoryIdAsync", null);
__decorate([
    (0, common_1.Delete)('remove-override/:categoryCommissionOverrideId'),
    (0, swagger_1.ApiOperation)({ operationId: 'CategoryCommissionOverridesRemoveOverride' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __param(0, (0, common_1.Param)('categoryCommissionOverrideId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], CategoryCommissionOverridesController.prototype, "removeOverrideAsync", null);
exports.CategoryCommissionOverridesController = CategoryCommissionOverridesController = __decorate([
    (0, swagger_1.ApiTags)('CategoryCommissionOverrides'),
    (0, swagger_1.ApiBearerAuth)('Bearer'),
    (0, common_1.Controller)('api/pricing-engine-module/category-commission-overrides'),
    __metadata("design:paramtypes", [cqrs_1.QueryBus,
        cqrs_1.CommandBus])
], CategoryCommissionOverridesController);
//# sourceMappingURL=categoryCommissionOverride.controller.g.js.map