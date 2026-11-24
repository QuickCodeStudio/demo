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
var CommissionModelRepository_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommissionModelRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const commissionModel_dto_g_1 = require("../dto/commissionModel.dto.g");
const common_2 = require("@demo/common");
const sql_loader_1 = require("../db/sql-loader");
let CommissionModelRepository = CommissionModelRepository_1 = class CommissionModelRepository {
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(CommissionModelRepository_1.name);
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
            const rows = (0, sql_loader_1.asRows)(await (0, sql_loader_1.executeNamedSqlScript)(this.dataSource, 'CommissionModel', 'Crud', 'List', {
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
            const n = (0, sql_loader_1.scalarNumber)(await (0, sql_loader_1.executeNamedSqlScript)(this.dataSource, 'CommissionModel', 'Crud', 'Count'));
            return common_2.RepoResponse.ok(n);
        }
        catch (err) {
            this.logger.error('countAsync', err);
            return common_2.RepoResponse.error(err);
        }
    }
    async getByPkAsync(id) {
        try {
            const params = {
                'PRM_COMMISSION_MODEL_ID': id,
            };
            const row = (0, sql_loader_1.firstRow)(await (0, sql_loader_1.executeNamedSqlScript)(this.dataSource, 'CommissionModel', 'Crud', 'GetByPk', params));
            if (!row)
                return common_2.RepoResponse.notFound('CommissionModel');
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
                'PRM_COMMISSION_MODEL_NAME': dto.name ?? null,
                'PRM_COMMISSION_MODEL_IS_ACTIVE': dto.isActive ?? null,
                'PRM_COMMISSION_MODEL_DESCRIPTION': dto.description ?? null,
            };
            const row = (0, sql_loader_1.firstRow)(await (0, sql_loader_1.executeNamedSqlScript)(this.dataSource, 'CommissionModel', 'Crud', 'Insert', params));
            if (row)
                return common_2.RepoResponse.ok(this.toDto(row));
            return common_2.RepoResponse.ok(Object.assign(new commissionModel_dto_g_1.CommissionModelDto(), dto));
        }
        catch (err) {
            this.logger.error('insertAsync', err);
            return common_2.RepoResponse.error(err);
        }
    }
    async updateAsync(id, dto) {
        try {
            const params = {
                'PRM_COMMISSION_MODEL_NAME': dto.name ?? null,
                'PRM_COMMISSION_MODEL_IS_ACTIVE': dto.isActive ?? null,
                'PRM_COMMISSION_MODEL_DESCRIPTION': dto.description ?? null,
                'PRM_COMMISSION_MODEL_ID': id,
            };
            const affected = (0, sql_loader_1.affectedCount)(await (0, sql_loader_1.executeNamedSqlScript)(this.dataSource, 'CommissionModel', 'Crud', 'Update', params));
            if (affected === 0)
                return common_2.RepoResponse.notFound('CommissionModel');
            return common_2.RepoResponse.ok(true);
        }
        catch (err) {
            this.logger.error('updateAsync', err);
            return common_2.RepoResponse.error(err);
        }
    }
    async deleteAsync(id) {
        try {
            const params = {
                'PRM_COMMISSION_MODEL_ID': id,
            };
            const affected = (0, sql_loader_1.affectedCount)(await (0, sql_loader_1.executeNamedSqlScript)(this.dataSource, 'CommissionModel', 'Crud', 'Delete', params));
            if (affected === 0)
                return common_2.RepoResponse.notFound('CommissionModel');
            return common_2.RepoResponse.ok(true);
        }
        catch (err) {
            this.logger.error('deleteAsync', err);
            return common_2.RepoResponse.error(err);
        }
    }
    async getActiveAsync(pageNumber, pageSize) {
        try {
            const rows = await (0, sql_loader_1.executeSqlScript)(this.dataSource, 'CommissionModel', 'Query', 'GetActive', [pageNumber, pageSize]);
            return common_2.RepoResponse.ok(rows);
        }
        catch (err) {
            this.logger.error('GetActive', err);
            return common_2.RepoResponse.error(err);
        }
    }
    async getByNameAsync(name) {
        try {
            const rows = await (0, sql_loader_1.executeSqlScript)(this.dataSource, 'CommissionModel', 'Query', 'GetByName', [name]);
            return common_2.RepoResponse.ok((rows?.[0] ?? null));
        }
        catch (err) {
            this.logger.error('GetByName', err);
            return common_2.RepoResponse.error(err);
        }
    }
    async deactivateAsync(commissionModelId, dto) {
        try {
            const result = await (0, sql_loader_1.executeSqlScript)(this.dataSource, 'CommissionModel', 'Command', 'Deactivate', [commissionModelId]);
            return common_2.RepoResponse.ok((0, sql_loader_1.affectedCount)(result));
        }
        catch (err) {
            this.logger.error('Deactivate', err);
            return common_2.RepoResponse.error(err);
        }
    }
    toDto(row) {
        const dto = new commissionModel_dto_g_1.CommissionModelDto();
        dto.id = this.pick(row, 'ID', 'id');
        dto.name = this.pick(row, 'NAME', 'name');
        dto.isActive = this.pick(row, 'IS_ACTIVE', 'isActive');
        dto.description = this.pick(row, 'DESCRIPTION', 'description');
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
exports.CommissionModelRepository = CommissionModelRepository;
exports.CommissionModelRepository = CommissionModelRepository = CommissionModelRepository_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], CommissionModelRepository);
//# sourceMappingURL=commissionModel.repository.g.js.map