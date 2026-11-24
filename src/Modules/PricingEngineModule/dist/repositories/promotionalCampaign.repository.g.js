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
var PromotionalCampaignRepository_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromotionalCampaignRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const promotionalCampaign_dto_g_1 = require("../dto/promotionalCampaign.dto.g");
const common_2 = require("@demo/common");
const sql_loader_1 = require("../db/sql-loader");
let PromotionalCampaignRepository = PromotionalCampaignRepository_1 = class PromotionalCampaignRepository {
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(PromotionalCampaignRepository_1.name);
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
            const rows = (0, sql_loader_1.asRows)(await (0, sql_loader_1.executeNamedSqlScript)(this.dataSource, 'PromotionalCampaign', 'Crud', 'List', {
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
            const n = (0, sql_loader_1.scalarNumber)(await (0, sql_loader_1.executeNamedSqlScript)(this.dataSource, 'PromotionalCampaign', 'Crud', 'Count'));
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
                'PRM_PROMOTIONAL_CAMPAIGN_ID': id,
            };
            const row = (0, sql_loader_1.firstRow)(await (0, sql_loader_1.executeNamedSqlScript)(this.dataSource, 'PromotionalCampaign', 'Crud', 'GetByPk', params));
            if (!row)
                return common_2.RepoResponse.notFound('PromotionalCampaign');
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
                'PRM_PROMOTIONAL_CAMPAIGN_NAME': dto.name ?? null,
                'PRM_PROMOTIONAL_CAMPAIGN_START_DATE': dto.startDate ?? null,
                'PRM_PROMOTIONAL_CAMPAIGN_END_DATE': dto.endDate ?? null,
                'PRM_PROMOTIONAL_CAMPAIGN_DISCOUNT_PERCENTAGE': dto.discountPercentage ?? null,
                'PRM_PROMOTIONAL_CAMPAIGN_IS_ACTIVE': dto.isActive ?? null,
            };
            const row = (0, sql_loader_1.firstRow)(await (0, sql_loader_1.executeNamedSqlScript)(this.dataSource, 'PromotionalCampaign', 'Crud', 'Insert', params));
            if (row)
                return common_2.RepoResponse.ok(this.toDto(row));
            return common_2.RepoResponse.ok(Object.assign(new promotionalCampaign_dto_g_1.PromotionalCampaignDto(), dto));
        }
        catch (err) {
            this.logger.error('insertAsync', err);
            return common_2.RepoResponse.error(err);
        }
    }
    async updateAsync(id, dto) {
        try {
            const params = {
                'PRM_PROMOTIONAL_CAMPAIGN_NAME': dto.name ?? null,
                'PRM_PROMOTIONAL_CAMPAIGN_START_DATE': dto.startDate ?? null,
                'PRM_PROMOTIONAL_CAMPAIGN_END_DATE': dto.endDate ?? null,
                'PRM_PROMOTIONAL_CAMPAIGN_DISCOUNT_PERCENTAGE': dto.discountPercentage ?? null,
                'PRM_PROMOTIONAL_CAMPAIGN_IS_ACTIVE': dto.isActive ?? null,
                'PRM_PROMOTIONAL_CAMPAIGN_ID': id,
            };
            const affected = (0, sql_loader_1.affectedCount)(await (0, sql_loader_1.executeNamedSqlScript)(this.dataSource, 'PromotionalCampaign', 'Crud', 'Update', params));
            if (affected === 0)
                return common_2.RepoResponse.notFound('PromotionalCampaign');
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
                'PRM_PROMOTIONAL_CAMPAIGN_ID': id,
            };
            const affected = (0, sql_loader_1.affectedCount)(await (0, sql_loader_1.executeNamedSqlScript)(this.dataSource, 'PromotionalCampaign', 'Crud', 'Delete', params));
            if (affected === 0)
                return common_2.RepoResponse.notFound('PromotionalCampaign');
            return common_2.RepoResponse.ok(true);
        }
        catch (err) {
            this.logger.error('deleteAsync', err);
            return common_2.RepoResponse.error(err);
        }
    }
    async getActiveCampaignsAsync(pageNumber, pageSize) {
        try {
            const rows = await (0, sql_loader_1.executeSqlScript)(this.dataSource, 'PromotionalCampaign', 'Query', 'GetActiveCampaigns', [pageNumber, pageSize]);
            return common_2.RepoResponse.ok(rows);
        }
        catch (err) {
            this.logger.error('GetActiveCampaigns', err);
            return common_2.RepoResponse.error(err);
        }
    }
    async getCampaignsInDateRangeAsync(startDate_From, startDate_To, pageNumber, pageSize) {
        try {
            const rows = await (0, sql_loader_1.executeSqlScript)(this.dataSource, 'PromotionalCampaign', 'Query', 'GetCampaignsInDateRange', [startDate_From, startDate_To, pageNumber, pageSize]);
            return common_2.RepoResponse.ok(rows);
        }
        catch (err) {
            this.logger.error('GetCampaignsInDateRange', err);
            return common_2.RepoResponse.error(err);
        }
    }
    async deactivateAsync(promotionalCampaignId, dto) {
        try {
            const result = await (0, sql_loader_1.executeSqlScript)(this.dataSource, 'PromotionalCampaign', 'Command', 'Deactivate', [promotionalCampaignId]);
            return common_2.RepoResponse.ok((0, sql_loader_1.affectedCount)(result));
        }
        catch (err) {
            this.logger.error('Deactivate', err);
            return common_2.RepoResponse.error(err);
        }
    }
    toDto(row) {
        const dto = new promotionalCampaign_dto_g_1.PromotionalCampaignDto();
        dto.id = this.pick(row, 'ID', 'id');
        dto.name = this.pick(row, 'NAME', 'name');
        dto.startDate = this.pick(row, 'START_DATE', 'startDate');
        dto.endDate = this.pick(row, 'END_DATE', 'endDate');
        dto.discountPercentage = this.pick(row, 'DISCOUNT_PERCENTAGE', 'discountPercentage');
        dto.isActive = this.pick(row, 'IS_ACTIVE', 'isActive');
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
exports.PromotionalCampaignRepository = PromotionalCampaignRepository;
exports.PromotionalCampaignRepository = PromotionalCampaignRepository = PromotionalCampaignRepository_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], PromotionalCampaignRepository);
//# sourceMappingURL=promotionalCampaign.repository.g.js.map