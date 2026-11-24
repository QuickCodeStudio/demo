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
var CampaignApplicabilityRepository_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignApplicabilityRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const campaignApplicability_dto_g_1 = require("../dto/campaignApplicability.dto.g");
const common_2 = require("@demo/common");
const sql_loader_1 = require("../db/sql-loader");
let CampaignApplicabilityRepository = CampaignApplicabilityRepository_1 = class CampaignApplicabilityRepository {
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(CampaignApplicabilityRepository_1.name);
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
            const rows = (0, sql_loader_1.asRows)(await (0, sql_loader_1.executeNamedSqlScript)(this.dataSource, 'CampaignApplicability', 'Crud', 'List', {
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
            const n = (0, sql_loader_1.scalarNumber)(await (0, sql_loader_1.executeNamedSqlScript)(this.dataSource, 'CampaignApplicability', 'Crud', 'Count'));
            return common_2.RepoResponse.ok(n);
        }
        catch (err) {
            this.logger.error('countAsync', err);
            return common_2.RepoResponse.error(err);
        }
    }
    async getByPkAsync(campaignId, scope, scopeId) {
        try {
            const params = {
                'PRM_CAMPAIGN_APPLICABILITY_CAMPAIGN_ID': campaignId,
                'PRM_CAMPAIGN_APPLICABILITY_SCOPE': scope,
                'PRM_CAMPAIGN_APPLICABILITY_SCOPE_ID': scopeId,
            };
            const row = (0, sql_loader_1.firstRow)(await (0, sql_loader_1.executeNamedSqlScript)(this.dataSource, 'CampaignApplicability', 'Crud', 'GetByPk', params));
            if (!row)
                return common_2.RepoResponse.notFound('CampaignApplicability');
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
                'PRM_CAMPAIGN_APPLICABILITY_CAMPAIGN_ID': dto.campaignId ?? null,
                'PRM_CAMPAIGN_APPLICABILITY_SCOPE': dto.scope ?? null,
                'PRM_CAMPAIGN_APPLICABILITY_SCOPE_ID': dto.scopeId ?? null,
            };
            const row = (0, sql_loader_1.firstRow)(await (0, sql_loader_1.executeNamedSqlScript)(this.dataSource, 'CampaignApplicability', 'Crud', 'Insert', params));
            if (row)
                return common_2.RepoResponse.ok(this.toDto(row));
            return common_2.RepoResponse.ok(Object.assign(new campaignApplicability_dto_g_1.CampaignApplicabilityDto(), dto));
        }
        catch (err) {
            this.logger.error('insertAsync', err);
            return common_2.RepoResponse.error(err);
        }
    }
    async updateAsync(campaignId, scope, scopeId, dto) {
        try {
            const params = {
                'PRM_CAMPAIGN_APPLICABILITY_CAMPAIGN_ID_REMOVE': campaignId,
                'PRM_CAMPAIGN_APPLICABILITY_CAMPAIGN_ID_ADD': dto.campaignId ?? campaignId,
                'PRM_CAMPAIGN_APPLICABILITY_SCOPE_REMOVE': scope,
                'PRM_CAMPAIGN_APPLICABILITY_SCOPE_ADD': dto.scope ?? scope,
                'PRM_CAMPAIGN_APPLICABILITY_SCOPE_ID_REMOVE': scopeId,
                'PRM_CAMPAIGN_APPLICABILITY_SCOPE_ID_ADD': dto.scopeId ?? scopeId,
            };
            const affected = (0, sql_loader_1.affectedCount)(await (0, sql_loader_1.executeNamedSqlScript)(this.dataSource, 'CampaignApplicability', 'Crud', 'Update', params));
            if (affected === 0)
                return common_2.RepoResponse.notFound('CampaignApplicability');
            return common_2.RepoResponse.ok(true);
        }
        catch (err) {
            this.logger.error('updateAsync', err);
            return common_2.RepoResponse.error(err);
        }
    }
    async deleteAsync(campaignId, scope, scopeId) {
        try {
            const params = {
                'PRM_CAMPAIGN_APPLICABILITY_CAMPAIGN_ID': campaignId,
                'PRM_CAMPAIGN_APPLICABILITY_SCOPE': scope,
                'PRM_CAMPAIGN_APPLICABILITY_SCOPE_ID': scopeId,
            };
            const affected = (0, sql_loader_1.affectedCount)(await (0, sql_loader_1.executeNamedSqlScript)(this.dataSource, 'CampaignApplicability', 'Crud', 'Delete', params));
            if (affected === 0)
                return common_2.RepoResponse.notFound('CampaignApplicability');
            return common_2.RepoResponse.ok(true);
        }
        catch (err) {
            this.logger.error('deleteAsync', err);
            return common_2.RepoResponse.error(err);
        }
    }
    async getByCampaignIdAsync(campaignId) {
        try {
            const rows = await (0, sql_loader_1.executeSqlScript)(this.dataSource, 'CampaignApplicability', 'Query', 'GetByCampaignId', [campaignId]);
            return common_2.RepoResponse.ok(rows);
        }
        catch (err) {
            this.logger.error('GetByCampaignId', err);
            return common_2.RepoResponse.error(err);
        }
    }
    async removeApplicabilityAsync(campaignApplicabilityCampaignId, campaignApplicabilityScope, campaignApplicabilityScopeId) {
        try {
            const result = await (0, sql_loader_1.executeSqlScript)(this.dataSource, 'CampaignApplicability', 'Command', 'RemoveApplicability', [campaignApplicabilityCampaignId, campaignApplicabilityScope, campaignApplicabilityScopeId]);
            return common_2.RepoResponse.ok((0, sql_loader_1.affectedCount)(result));
        }
        catch (err) {
            this.logger.error('RemoveApplicability', err);
            return common_2.RepoResponse.error(err);
        }
    }
    toDto(row) {
        const dto = new campaignApplicability_dto_g_1.CampaignApplicabilityDto();
        dto.campaignId = this.pick(row, 'CAMPAIGN_ID', 'campaignId');
        dto.scope = this.pick(row, 'SCOPE', 'scope');
        dto.scopeId = this.pick(row, 'SCOPE_ID', 'scopeId');
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
exports.CampaignApplicabilityRepository = CampaignApplicabilityRepository;
exports.CampaignApplicabilityRepository = CampaignApplicabilityRepository = CampaignApplicabilityRepository_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], CampaignApplicabilityRepository);
//# sourceMappingURL=campaignApplicability.repository.g.js.map