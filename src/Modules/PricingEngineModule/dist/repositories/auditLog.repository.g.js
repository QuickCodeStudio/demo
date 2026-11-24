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
var AuditLogRepository_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const auditLog_dto_g_1 = require("../dto/auditLog.dto.g");
const common_2 = require("@demo/common");
const sql_loader_1 = require("../db/sql-loader");
let AuditLogRepository = AuditLogRepository_1 = class AuditLogRepository {
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(AuditLogRepository_1.name);
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
            const rows = (0, sql_loader_1.asRows)(await (0, sql_loader_1.executeNamedSqlScript)(this.dataSource, 'AuditLog', 'Crud', 'List', {
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
            const n = (0, sql_loader_1.scalarNumber)(await (0, sql_loader_1.executeNamedSqlScript)(this.dataSource, 'AuditLog', 'Crud', 'Count'));
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
                'PRM_AUDIT_LOG_ID': id,
            };
            const row = (0, sql_loader_1.firstRow)(await (0, sql_loader_1.executeNamedSqlScript)(this.dataSource, 'AuditLog', 'Crud', 'GetByPk', params));
            if (!row)
                return common_2.RepoResponse.notFound('AuditLog');
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
                'PRM_AUDIT_LOG_ID': dto.id ?? null,
                'PRM_AUDIT_LOG_ENTITY_NAME': dto.entityName ?? null,
                'PRM_AUDIT_LOG_ENTITY_ID': dto.entityId ?? null,
                'PRM_AUDIT_LOG_ACTION': dto.action ?? null,
                'PRM_AUDIT_LOG_USER_ID': dto.userId ?? null,
                'PRM_AUDIT_LOG_USER_NAME': dto.userName ?? null,
                'PRM_AUDIT_LOG_USER_GROUP': dto.userGroup ?? null,
                'PRM_AUDIT_LOG_TIMESTAMP': dto.timestamp ?? null,
                'PRM_AUDIT_LOG_DURATION_MS': dto.durationMs ?? null,
                'PRM_AUDIT_LOG_STATUS_CODE': dto.statusCode ?? null,
                'PRM_AUDIT_LOG_REQUEST_MODULE': dto.requestModule ?? null,
                'PRM_AUDIT_LOG_REQUEST_PATH': dto.requestPath ?? null,
                'PRM_AUDIT_LOG_OLD_VALUES': dto.oldValues ?? null,
                'PRM_AUDIT_LOG_NEW_VALUES': dto.newValues ?? null,
                'PRM_AUDIT_LOG_CHANGED_COLUMNS': dto.changedColumns ?? null,
                'PRM_AUDIT_LOG_IS_CHANGED': dto.isChanged ?? null,
                'PRM_AUDIT_LOG_CHANGE_SUMMARY': dto.changeSummary ?? null,
                'PRM_AUDIT_LOG_IP_ADDRESS': dto.ipAddress ?? null,
                'PRM_AUDIT_LOG_USER_AGENT': dto.userAgent ?? null,
                'PRM_AUDIT_LOG_CLIENT_ID': dto.clientId ?? null,
                'PRM_AUDIT_LOG_CORRELATION_ID': dto.correlationId ?? null,
                'PRM_AUDIT_LOG_IS_SUCCESS': dto.isSuccess ?? null,
                'PRM_AUDIT_LOG_ERROR_MESSAGE': dto.errorMessage ?? null,
                'PRM_AUDIT_LOG_HASH': dto.hash ?? null,
            };
            const row = (0, sql_loader_1.firstRow)(await (0, sql_loader_1.executeNamedSqlScript)(this.dataSource, 'AuditLog', 'Crud', 'Insert', params));
            if (row)
                return common_2.RepoResponse.ok(this.toDto(row));
            return common_2.RepoResponse.ok(Object.assign(new auditLog_dto_g_1.AuditLogDto(), dto));
        }
        catch (err) {
            this.logger.error('insertAsync', err);
            return common_2.RepoResponse.error(err);
        }
    }
    async updateAsync(id, dto) {
        try {
            const params = {
                'PRM_AUDIT_LOG_ENTITY_NAME': dto.entityName ?? null,
                'PRM_AUDIT_LOG_ENTITY_ID': dto.entityId ?? null,
                'PRM_AUDIT_LOG_ACTION': dto.action ?? null,
                'PRM_AUDIT_LOG_USER_ID': dto.userId ?? null,
                'PRM_AUDIT_LOG_USER_NAME': dto.userName ?? null,
                'PRM_AUDIT_LOG_USER_GROUP': dto.userGroup ?? null,
                'PRM_AUDIT_LOG_TIMESTAMP': dto.timestamp ?? null,
                'PRM_AUDIT_LOG_DURATION_MS': dto.durationMs ?? null,
                'PRM_AUDIT_LOG_STATUS_CODE': dto.statusCode ?? null,
                'PRM_AUDIT_LOG_REQUEST_MODULE': dto.requestModule ?? null,
                'PRM_AUDIT_LOG_REQUEST_PATH': dto.requestPath ?? null,
                'PRM_AUDIT_LOG_OLD_VALUES': dto.oldValues ?? null,
                'PRM_AUDIT_LOG_NEW_VALUES': dto.newValues ?? null,
                'PRM_AUDIT_LOG_CHANGED_COLUMNS': dto.changedColumns ?? null,
                'PRM_AUDIT_LOG_IS_CHANGED': dto.isChanged ?? null,
                'PRM_AUDIT_LOG_CHANGE_SUMMARY': dto.changeSummary ?? null,
                'PRM_AUDIT_LOG_IP_ADDRESS': dto.ipAddress ?? null,
                'PRM_AUDIT_LOG_USER_AGENT': dto.userAgent ?? null,
                'PRM_AUDIT_LOG_CLIENT_ID': dto.clientId ?? null,
                'PRM_AUDIT_LOG_CORRELATION_ID': dto.correlationId ?? null,
                'PRM_AUDIT_LOG_IS_SUCCESS': dto.isSuccess ?? null,
                'PRM_AUDIT_LOG_ERROR_MESSAGE': dto.errorMessage ?? null,
                'PRM_AUDIT_LOG_HASH': dto.hash ?? null,
                'PRM_AUDIT_LOG_ID': id,
            };
            const affected = (0, sql_loader_1.affectedCount)(await (0, sql_loader_1.executeNamedSqlScript)(this.dataSource, 'AuditLog', 'Crud', 'Update', params));
            if (affected === 0)
                return common_2.RepoResponse.notFound('AuditLog');
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
                'PRM_AUDIT_LOG_ID': id,
            };
            const affected = (0, sql_loader_1.affectedCount)(await (0, sql_loader_1.executeNamedSqlScript)(this.dataSource, 'AuditLog', 'Crud', 'Delete', params));
            if (affected === 0)
                return common_2.RepoResponse.notFound('AuditLog');
            return common_2.RepoResponse.ok(true);
        }
        catch (err) {
            this.logger.error('deleteAsync', err);
            return common_2.RepoResponse.error(err);
        }
    }
    async getRecentHttpRequestsAsync(pageNumber, pageSize) {
        try {
            const rows = await (0, sql_loader_1.executeSqlScript)(this.dataSource, 'AuditLog', 'Query', 'GetRecentHttpRequests', [pageNumber, pageSize]);
            return common_2.RepoResponse.ok(rows);
        }
        catch (err) {
            this.logger.error('GetRecentHttpRequests', err);
            return common_2.RepoResponse.error(err);
        }
    }
    async getRecentHttpRequestsByModuleAsync(requestModule, pageNumber, pageSize) {
        try {
            const rows = await (0, sql_loader_1.executeSqlScript)(this.dataSource, 'AuditLog', 'Query', 'GetRecentHttpRequestsByModule', [requestModule, pageNumber, pageSize]);
            return common_2.RepoResponse.ok(rows);
        }
        catch (err) {
            this.logger.error('GetRecentHttpRequestsByModule', err);
            return common_2.RepoResponse.error(err);
        }
    }
    async statsTodayHttpRequestsAsync() {
        try {
            const rows = await (0, sql_loader_1.executeSqlScript)(this.dataSource, 'AuditLog', 'Query', 'StatsTodayHttpRequests', []);
            return common_2.RepoResponse.ok((rows?.[0] ?? null));
        }
        catch (err) {
            this.logger.error('StatsTodayHttpRequests', err);
            return common_2.RepoResponse.error(err);
        }
    }
    async statsLastHourHttpRequestsAsync() {
        try {
            const rows = await (0, sql_loader_1.executeSqlScript)(this.dataSource, 'AuditLog', 'Query', 'StatsLastHourHttpRequests', []);
            return common_2.RepoResponse.ok((rows?.[0] ?? null));
        }
        catch (err) {
            this.logger.error('StatsLastHourHttpRequests', err);
            return common_2.RepoResponse.error(err);
        }
    }
    async statsYesterdayHttpRequestsAsync() {
        try {
            const rows = await (0, sql_loader_1.executeSqlScript)(this.dataSource, 'AuditLog', 'Query', 'StatsYesterdayHttpRequests', []);
            return common_2.RepoResponse.ok((rows?.[0] ?? null));
        }
        catch (err) {
            this.logger.error('StatsYesterdayHttpRequests', err);
            return common_2.RepoResponse.error(err);
        }
    }
    async statsWeeklyHttpRequestsAsync() {
        try {
            const rows = await (0, sql_loader_1.executeSqlScript)(this.dataSource, 'AuditLog', 'Query', 'StatsWeeklyHttpRequests', []);
            return common_2.RepoResponse.ok((rows?.[0] ?? null));
        }
        catch (err) {
            this.logger.error('StatsWeeklyHttpRequests', err);
            return common_2.RepoResponse.error(err);
        }
    }
    async statsMonthlyHttpRequestsAsync() {
        try {
            const rows = await (0, sql_loader_1.executeSqlScript)(this.dataSource, 'AuditLog', 'Query', 'StatsMonthlyHttpRequests', []);
            return common_2.RepoResponse.ok((rows?.[0] ?? null));
        }
        catch (err) {
            this.logger.error('StatsMonthlyHttpRequests', err);
            return common_2.RepoResponse.error(err);
        }
    }
    async statsYearlyHttpRequestsAsync() {
        try {
            const rows = await (0, sql_loader_1.executeSqlScript)(this.dataSource, 'AuditLog', 'Query', 'StatsYearlyHttpRequests', []);
            return common_2.RepoResponse.ok((rows?.[0] ?? null));
        }
        catch (err) {
            this.logger.error('StatsYearlyHttpRequests', err);
            return common_2.RepoResponse.error(err);
        }
    }
    async statsDailyHttpRequestsByDayAsync() {
        try {
            const rows = await (0, sql_loader_1.executeSqlScript)(this.dataSource, 'AuditLog', 'Query', 'StatsDailyHttpRequestsByDay', []);
            return common_2.RepoResponse.ok(rows);
        }
        catch (err) {
            this.logger.error('StatsDailyHttpRequestsByDay', err);
            return common_2.RepoResponse.error(err);
        }
    }
    async statsDailyHttpRequestsByDayByModuleAsync() {
        try {
            const rows = await (0, sql_loader_1.executeSqlScript)(this.dataSource, 'AuditLog', 'Query', 'StatsDailyHttpRequestsByDayByModule', []);
            return common_2.RepoResponse.ok(rows);
        }
        catch (err) {
            this.logger.error('StatsDailyHttpRequestsByDayByModule', err);
            return common_2.RepoResponse.error(err);
        }
    }
    async statsHourlyHttpRequestsByModuleAsync() {
        try {
            const rows = await (0, sql_loader_1.executeSqlScript)(this.dataSource, 'AuditLog', 'Query', 'StatsHourlyHttpRequestsByModule', []);
            return common_2.RepoResponse.ok(rows);
        }
        catch (err) {
            this.logger.error('StatsHourlyHttpRequestsByModule', err);
            return common_2.RepoResponse.error(err);
        }
    }
    async statsTotalHttpRequestsByModuleAsync() {
        try {
            const rows = await (0, sql_loader_1.executeSqlScript)(this.dataSource, 'AuditLog', 'Query', 'StatsTotalHttpRequestsByModule', []);
            return common_2.RepoResponse.ok(rows);
        }
        catch (err) {
            this.logger.error('StatsTotalHttpRequestsByModule', err);
            return common_2.RepoResponse.error(err);
        }
    }
    async statsHttpStatusCodesLast24HoursByModuleAsync() {
        try {
            const rows = await (0, sql_loader_1.executeSqlScript)(this.dataSource, 'AuditLog', 'Query', 'StatsHttpStatusCodesLast24HoursByModule', []);
            return common_2.RepoResponse.ok(rows);
        }
        catch (err) {
            this.logger.error('StatsHttpStatusCodesLast24HoursByModule', err);
            return common_2.RepoResponse.error(err);
        }
    }
    async statsHttpStatusCodesAsync() {
        try {
            const rows = await (0, sql_loader_1.executeSqlScript)(this.dataSource, 'AuditLog', 'Query', 'StatsHttpStatusCodes', []);
            return common_2.RepoResponse.ok(rows);
        }
        catch (err) {
            this.logger.error('StatsHttpStatusCodes', err);
            return common_2.RepoResponse.error(err);
        }
    }
    async statsHttpStatusCodesByModuleAsync() {
        try {
            const rows = await (0, sql_loader_1.executeSqlScript)(this.dataSource, 'AuditLog', 'Query', 'StatsHttpStatusCodesByModule', []);
            return common_2.RepoResponse.ok(rows);
        }
        catch (err) {
            this.logger.error('StatsHttpStatusCodesByModule', err);
            return common_2.RepoResponse.error(err);
        }
    }
    async statsTopHttpServicesByModuleAsync() {
        try {
            const rows = await (0, sql_loader_1.executeSqlScript)(this.dataSource, 'AuditLog', 'Query', 'StatsTopHttpServicesByModule', []);
            return common_2.RepoResponse.ok(rows);
        }
        catch (err) {
            this.logger.error('StatsTopHttpServicesByModule', err);
            return common_2.RepoResponse.error(err);
        }
    }
    toDto(row) {
        const dto = new auditLog_dto_g_1.AuditLogDto();
        dto.id = this.pick(row, 'ID', 'id');
        dto.entityName = this.pick(row, 'ENTITY_NAME', 'entityName');
        dto.entityId = this.pick(row, 'ENTITY_ID', 'entityId');
        dto.action = this.pick(row, 'ACTION', 'action');
        dto.userId = this.pick(row, 'USER_ID', 'userId');
        dto.userName = this.pick(row, 'USER_NAME', 'userName');
        dto.userGroup = this.pick(row, 'USER_GROUP', 'userGroup');
        dto.timestamp = this.pick(row, 'TIMESTAMP', 'timestamp');
        dto.durationMs = this.pick(row, 'DURATION_MS', 'durationMs');
        dto.statusCode = this.pick(row, 'STATUS_CODE', 'statusCode');
        dto.requestModule = this.pick(row, 'REQUEST_MODULE', 'requestModule');
        dto.requestPath = this.pick(row, 'REQUEST_PATH', 'requestPath');
        dto.oldValues = this.pick(row, 'OLD_VALUES', 'oldValues');
        dto.newValues = this.pick(row, 'NEW_VALUES', 'newValues');
        dto.changedColumns = this.pick(row, 'CHANGED_COLUMNS', 'changedColumns');
        dto.isChanged = this.pick(row, 'IS_CHANGED', 'isChanged');
        dto.changeSummary = this.pick(row, 'CHANGE_SUMMARY', 'changeSummary');
        dto.ipAddress = this.pick(row, 'IP_ADDRESS', 'ipAddress');
        dto.userAgent = this.pick(row, 'USER_AGENT', 'userAgent');
        dto.clientId = this.pick(row, 'CLIENT_ID', 'clientId');
        dto.correlationId = this.pick(row, 'CORRELATION_ID', 'correlationId');
        dto.isSuccess = this.pick(row, 'IS_SUCCESS', 'isSuccess');
        dto.errorMessage = this.pick(row, 'ERROR_MESSAGE', 'errorMessage');
        dto.hash = this.pick(row, 'HASH', 'hash');
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
exports.AuditLogRepository = AuditLogRepository;
exports.AuditLogRepository = AuditLogRepository = AuditLogRepository_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], AuditLogRepository);
//# sourceMappingURL=auditLog.repository.g.js.map