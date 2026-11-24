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
var SellerCommissionAssignmentRepository_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SellerCommissionAssignmentRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const sellerCommissionAssignment_dto_g_1 = require("../dto/sellerCommissionAssignment.dto.g");
const common_2 = require("@demo/common");
const sql_loader_1 = require("../db/sql-loader");
let SellerCommissionAssignmentRepository = SellerCommissionAssignmentRepository_1 = class SellerCommissionAssignmentRepository {
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(SellerCommissionAssignmentRepository_1.name);
    }
    async listAsync(page, size) {
        try {
            const maxPageSize = 500;
            let offset = 0;
            let take = maxPageSize;
            if (page != null && page >= 1 && size != null && size > 0) {
                take = Math.min(size, maxPageSize);
                offset = (page - 1) * take;
            }
            const rows = (0, sql_loader_1.asRows)(await (0, sql_loader_1.executeNamedSqlScript)(this.dataSource, 'SellerCommissionAssignment', 'Crud', 'List', {
                PRM_QC_LIST_OFFSET: offset,
                PRM_QC_LIST_PAGE_SIZE: take,
            }));
            return common_2.RepoResponse.ok(rows.map(r => this.toDto(r)));
        }
        catch (err) {
            this.logger.error('listAsync', err);
            return common_2.RepoResponse.error(err);
        }
    }
    async countAsync() {
        try {
            const n = (0, sql_loader_1.scalarNumber)(await (0, sql_loader_1.executeNamedSqlScript)(this.dataSource, 'SellerCommissionAssignment', 'Crud', 'Count'));
            return common_2.RepoResponse.ok(n);
        }
        catch (err) {
            this.logger.error('countAsync', err);
            return common_2.RepoResponse.error(err);
        }
    }
    async getByPkAsync(sellerId) {
        try {
            const params = {
                'PRM_SELLER_COMMISSION_ASSIGNMENT_SELLER_ID': sellerId,
            };
            const row = (0, sql_loader_1.firstRow)(await (0, sql_loader_1.executeNamedSqlScript)(this.dataSource, 'SellerCommissionAssignment', 'Crud', 'GetByPk', params));
            if (!row)
                return common_2.RepoResponse.notFound('SellerCommissionAssignment');
            return common_2.RepoResponse.ok(this.toDto(row));
        }
        catch (err) {
            this.logger.error('getByPkAsync', err);
            return common_2.RepoResponse.error(err);
        }
    }
    async insertAsync(dto) {
        try {
            const params = {
                'PRM_SELLER_COMMISSION_ASSIGNMENT_SELLER_ID': dto.sellerId ?? null,
                'PRM_SELLER_COMMISSION_ASSIGNMENT_COMMISSION_MODEL_ID': dto.commissionModelId ?? null,
                'PRM_SELLER_COMMISSION_ASSIGNMENT_EFFECTIVE_DATE': dto.effectiveDate ?? null,
            };
            const row = (0, sql_loader_1.firstRow)(await (0, sql_loader_1.executeNamedSqlScript)(this.dataSource, 'SellerCommissionAssignment', 'Crud', 'Insert', params));
            if (row)
                return common_2.RepoResponse.ok(this.toDto(row));
            return common_2.RepoResponse.ok(Object.assign(new sellerCommissionAssignment_dto_g_1.SellerCommissionAssignmentDto(), dto));
        }
        catch (err) {
            this.logger.error('insertAsync', err);
            return common_2.RepoResponse.error(err);
        }
    }
    async updateAsync(sellerId, dto) {
        try {
            const params = {
                'PRM_SELLER_COMMISSION_ASSIGNMENT_COMMISSION_MODEL_ID': dto.commissionModelId ?? null,
                'PRM_SELLER_COMMISSION_ASSIGNMENT_EFFECTIVE_DATE': dto.effectiveDate ?? null,
                'PRM_SELLER_COMMISSION_ASSIGNMENT_SELLER_ID': sellerId,
            };
            const affected = (0, sql_loader_1.affectedCount)(await (0, sql_loader_1.executeNamedSqlScript)(this.dataSource, 'SellerCommissionAssignment', 'Crud', 'Update', params));
            if (affected === 0)
                return common_2.RepoResponse.notFound('SellerCommissionAssignment');
            return common_2.RepoResponse.ok(true);
        }
        catch (err) {
            this.logger.error('updateAsync', err);
            return common_2.RepoResponse.error(err);
        }
    }
    async deleteAsync(sellerId) {
        try {
            const params = {
                'PRM_SELLER_COMMISSION_ASSIGNMENT_SELLER_ID': sellerId,
            };
            const affected = (0, sql_loader_1.affectedCount)(await (0, sql_loader_1.executeNamedSqlScript)(this.dataSource, 'SellerCommissionAssignment', 'Crud', 'Delete', params));
            if (affected === 0)
                return common_2.RepoResponse.notFound('SellerCommissionAssignment');
            return common_2.RepoResponse.ok(true);
        }
        catch (err) {
            this.logger.error('deleteAsync', err);
            return common_2.RepoResponse.error(err);
        }
    }
    async getBySellerIdAsync(sellerId) {
        try {
            const rows = await (0, sql_loader_1.executeSqlScript)(this.dataSource, 'SellerCommissionAssignment', 'Query', 'GetBySellerId', [sellerId]);
            return common_2.RepoResponse.ok((rows?.[0] ?? null));
        }
        catch (err) {
            this.logger.error('GetBySellerId', err);
            return common_2.RepoResponse.error(err);
        }
    }
    async getByModelIdAsync(commissionModelId, pageNumber, pageSize) {
        try {
            const rows = await (0, sql_loader_1.executeSqlScript)(this.dataSource, 'SellerCommissionAssignment', 'Query', 'GetByModelId', [commissionModelId, pageNumber, pageSize]);
            return common_2.RepoResponse.ok(rows);
        }
        catch (err) {
            this.logger.error('GetByModelId', err);
            return common_2.RepoResponse.error(err);
        }
    }
    async removeAssignmentAsync(sellerCommissionAssignmentSellerId) {
        try {
            const result = await (0, sql_loader_1.executeSqlScript)(this.dataSource, 'SellerCommissionAssignment', 'Command', 'RemoveAssignment', [sellerCommissionAssignmentSellerId]);
            return common_2.RepoResponse.ok((0, sql_loader_1.affectedCount)(result));
        }
        catch (err) {
            this.logger.error('RemoveAssignment', err);
            return common_2.RepoResponse.error(err);
        }
    }
    toDto(row) {
        const dto = new sellerCommissionAssignment_dto_g_1.SellerCommissionAssignmentDto();
        dto.sellerId = this.pick(row, 'SELLER_ID', 'sellerId');
        dto.commissionModelId = this.pick(row, 'COMMISSION_MODEL_ID', 'commissionModelId');
        dto.effectiveDate = this.pick(row, 'EFFECTIVE_DATE', 'effectiveDate');
        return dto;
    }
    pick(row, ...keys) {
        const upper = keys.map(k => k.replace(/_/g, '').toUpperCase());
        for (const [k, v] of Object.entries(row)) {
            const nk = k.replace(/_/g, '').toUpperCase();
            if (upper.includes(nk))
                return v;
        }
        return undefined;
    }
};
exports.SellerCommissionAssignmentRepository = SellerCommissionAssignmentRepository;
exports.SellerCommissionAssignmentRepository = SellerCommissionAssignmentRepository = SellerCommissionAssignmentRepository_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], SellerCommissionAssignmentRepository);
//# sourceMappingURL=sellerCommissionAssignment.repository.g.js.map