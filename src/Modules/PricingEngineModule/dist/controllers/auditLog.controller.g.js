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
exports.AuditLogsController = void 0;
const common_1 = require("@nestjs/common");
const cqrs_1 = require("@nestjs/cqrs");
const swagger_1 = require("@nestjs/swagger");
const auditLog_dto_g_1 = require("../dto/auditLog.dto.g");
const auditLog_getRecentHttpRequests_response_dto_g_1 = require("../dto/auditLog.getRecentHttpRequests.response.dto.g");
const auditLog_getRecentHttpRequestsByModule_response_dto_g_1 = require("../dto/auditLog.getRecentHttpRequestsByModule.response.dto.g");
const auditLog_statsTodayHttpRequests_response_dto_g_1 = require("../dto/auditLog.statsTodayHttpRequests.response.dto.g");
const auditLog_statsLastHourHttpRequests_response_dto_g_1 = require("../dto/auditLog.statsLastHourHttpRequests.response.dto.g");
const auditLog_statsYesterdayHttpRequests_response_dto_g_1 = require("../dto/auditLog.statsYesterdayHttpRequests.response.dto.g");
const auditLog_statsWeeklyHttpRequests_response_dto_g_1 = require("../dto/auditLog.statsWeeklyHttpRequests.response.dto.g");
const auditLog_statsMonthlyHttpRequests_response_dto_g_1 = require("../dto/auditLog.statsMonthlyHttpRequests.response.dto.g");
const auditLog_statsYearlyHttpRequests_response_dto_g_1 = require("../dto/auditLog.statsYearlyHttpRequests.response.dto.g");
const auditLog_statsDailyHttpRequestsByDay_response_dto_g_1 = require("../dto/auditLog.statsDailyHttpRequestsByDay.response.dto.g");
const auditLog_statsDailyHttpRequestsByDayByModule_response_dto_g_1 = require("../dto/auditLog.statsDailyHttpRequestsByDayByModule.response.dto.g");
const auditLog_statsHourlyHttpRequestsByModule_response_dto_g_1 = require("../dto/auditLog.statsHourlyHttpRequestsByModule.response.dto.g");
const auditLog_statsTotalHttpRequestsByModule_response_dto_g_1 = require("../dto/auditLog.statsTotalHttpRequestsByModule.response.dto.g");
const auditLog_statsHttpStatusCodesLast24HoursByModule_response_dto_g_1 = require("../dto/auditLog.statsHttpStatusCodesLast24HoursByModule.response.dto.g");
const auditLog_statsHttpStatusCodes_response_dto_g_1 = require("../dto/auditLog.statsHttpStatusCodes.response.dto.g");
const auditLog_statsHttpStatusCodesByModule_response_dto_g_1 = require("../dto/auditLog.statsHttpStatusCodesByModule.response.dto.g");
const auditLog_statsTopHttpServicesByModule_response_dto_g_1 = require("../dto/auditLog.statsTopHttpServicesByModule.response.dto.g");
const list_auditLog_query_g_1 = require("../features/queries/auditLog/list-auditLog.query.g");
const get_item_auditLog_query_g_1 = require("../features/queries/auditLog/get-item-auditLog.query.g");
const total_item_count_auditLog_query_g_1 = require("../features/queries/auditLog/total-item-count-auditLog.query.g");
const insert_auditLog_command_g_1 = require("../features/commands/auditLog/insert-auditLog.command.g");
const update_auditLog_command_g_1 = require("../features/commands/auditLog/update-auditLog.command.g");
const delete_item_auditLog_command_g_1 = require("../features/commands/auditLog/delete-item-auditLog.command.g");
const getRecentHttpRequests_auditLog_query_g_1 = require("../features/queries/auditLog/getRecentHttpRequests-auditLog.query.g");
const getRecentHttpRequestsByModule_auditLog_query_g_1 = require("../features/queries/auditLog/getRecentHttpRequestsByModule-auditLog.query.g");
const statsTodayHttpRequests_auditLog_query_g_1 = require("../features/queries/auditLog/statsTodayHttpRequests-auditLog.query.g");
const statsLastHourHttpRequests_auditLog_query_g_1 = require("../features/queries/auditLog/statsLastHourHttpRequests-auditLog.query.g");
const statsYesterdayHttpRequests_auditLog_query_g_1 = require("../features/queries/auditLog/statsYesterdayHttpRequests-auditLog.query.g");
const statsWeeklyHttpRequests_auditLog_query_g_1 = require("../features/queries/auditLog/statsWeeklyHttpRequests-auditLog.query.g");
const statsMonthlyHttpRequests_auditLog_query_g_1 = require("../features/queries/auditLog/statsMonthlyHttpRequests-auditLog.query.g");
const statsYearlyHttpRequests_auditLog_query_g_1 = require("../features/queries/auditLog/statsYearlyHttpRequests-auditLog.query.g");
const statsDailyHttpRequestsByDay_auditLog_query_g_1 = require("../features/queries/auditLog/statsDailyHttpRequestsByDay-auditLog.query.g");
const statsDailyHttpRequestsByDayByModule_auditLog_query_g_1 = require("../features/queries/auditLog/statsDailyHttpRequestsByDayByModule-auditLog.query.g");
const statsHourlyHttpRequestsByModule_auditLog_query_g_1 = require("../features/queries/auditLog/statsHourlyHttpRequestsByModule-auditLog.query.g");
const statsTotalHttpRequestsByModule_auditLog_query_g_1 = require("../features/queries/auditLog/statsTotalHttpRequestsByModule-auditLog.query.g");
const statsHttpStatusCodesLast24HoursByModule_auditLog_query_g_1 = require("../features/queries/auditLog/statsHttpStatusCodesLast24HoursByModule-auditLog.query.g");
const statsHttpStatusCodes_auditLog_query_g_1 = require("../features/queries/auditLog/statsHttpStatusCodes-auditLog.query.g");
const statsHttpStatusCodesByModule_auditLog_query_g_1 = require("../features/queries/auditLog/statsHttpStatusCodesByModule-auditLog.query.g");
const statsTopHttpServicesByModule_auditLog_query_g_1 = require("../features/queries/auditLog/statsTopHttpServicesByModule-auditLog.query.g");
const common_2 = require("@demo/common");
let AuditLogsController = class AuditLogsController {
    constructor(queryBus, commandBus) {
        this.queryBus = queryBus;
        this.commandBus = commandBus;
    }
    async listAsync(page, size, includeCount = false) {
        const r = await this.queryBus.execute(new list_auditLog_query_g_1.ListAuditLogQuery(page, size, includeCount));
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async countAsync() {
        const r = await this.queryBus.execute(new total_item_count_auditLog_query_g_1.TotalItemCountAuditLogQuery());
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async getItemAsync(id) {
        const r = await this.queryBus.execute(new get_item_auditLog_query_g_1.GetItemAuditLogQuery(id));
        if (r.code === 404)
            throw new common_1.NotFoundException(r.message);
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async insertAsync(dto) {
        const r = await this.commandBus.execute(new insert_auditLog_command_g_1.InsertAuditLogCommand(dto));
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async updateAsync(id, dto) {
        const r = await this.commandBus.execute(new update_auditLog_command_g_1.UpdateAuditLogCommand(id, dto));
        if (r.code === 404)
            throw new common_1.NotFoundException(r.message);
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async deleteAsync(id) {
        const r = await this.commandBus.execute(new delete_item_auditLog_command_g_1.DeleteItemAuditLogCommand(id));
        if (r.code === 404)
            throw new common_1.NotFoundException(r.message);
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async getRecentHttpRequestsAsync(pageNumber, pageSize) {
        const r = await this.queryBus.execute(new getRecentHttpRequests_auditLog_query_g_1.GetRecentHttpRequestsAuditLogQuery(pageNumber, pageSize));
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async getRecentHttpRequestsByModuleAsync(requestModule, pageNumber, pageSize) {
        const r = await this.queryBus.execute(new getRecentHttpRequestsByModule_auditLog_query_g_1.GetRecentHttpRequestsByModuleAuditLogQuery(requestModule, pageNumber, pageSize));
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async statsTodayHttpRequestsAsync() {
        const r = await this.queryBus.execute(new statsTodayHttpRequests_auditLog_query_g_1.StatsTodayHttpRequestsAuditLogQuery());
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async statsLastHourHttpRequestsAsync() {
        const r = await this.queryBus.execute(new statsLastHourHttpRequests_auditLog_query_g_1.StatsLastHourHttpRequestsAuditLogQuery());
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async statsYesterdayHttpRequestsAsync() {
        const r = await this.queryBus.execute(new statsYesterdayHttpRequests_auditLog_query_g_1.StatsYesterdayHttpRequestsAuditLogQuery());
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async statsWeeklyHttpRequestsAsync() {
        const r = await this.queryBus.execute(new statsWeeklyHttpRequests_auditLog_query_g_1.StatsWeeklyHttpRequestsAuditLogQuery());
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async statsMonthlyHttpRequestsAsync() {
        const r = await this.queryBus.execute(new statsMonthlyHttpRequests_auditLog_query_g_1.StatsMonthlyHttpRequestsAuditLogQuery());
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async statsYearlyHttpRequestsAsync() {
        const r = await this.queryBus.execute(new statsYearlyHttpRequests_auditLog_query_g_1.StatsYearlyHttpRequestsAuditLogQuery());
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async statsDailyHttpRequestsByDayAsync() {
        const r = await this.queryBus.execute(new statsDailyHttpRequestsByDay_auditLog_query_g_1.StatsDailyHttpRequestsByDayAuditLogQuery());
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async statsDailyHttpRequestsByDayByModuleAsync() {
        const r = await this.queryBus.execute(new statsDailyHttpRequestsByDayByModule_auditLog_query_g_1.StatsDailyHttpRequestsByDayByModuleAuditLogQuery());
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async statsHourlyHttpRequestsByModuleAsync() {
        const r = await this.queryBus.execute(new statsHourlyHttpRequestsByModule_auditLog_query_g_1.StatsHourlyHttpRequestsByModuleAuditLogQuery());
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async statsTotalHttpRequestsByModuleAsync() {
        const r = await this.queryBus.execute(new statsTotalHttpRequestsByModule_auditLog_query_g_1.StatsTotalHttpRequestsByModuleAuditLogQuery());
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async statsHttpStatusCodesLast24HoursByModuleAsync() {
        const r = await this.queryBus.execute(new statsHttpStatusCodesLast24HoursByModule_auditLog_query_g_1.StatsHttpStatusCodesLast24HoursByModuleAuditLogQuery());
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async statsHttpStatusCodesAsync() {
        const r = await this.queryBus.execute(new statsHttpStatusCodes_auditLog_query_g_1.StatsHttpStatusCodesAuditLogQuery());
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async statsHttpStatusCodesByModuleAsync() {
        const r = await this.queryBus.execute(new statsHttpStatusCodesByModule_auditLog_query_g_1.StatsHttpStatusCodesByModuleAuditLogQuery());
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
    async statsTopHttpServicesByModuleAsync() {
        const r = await this.queryBus.execute(new statsTopHttpServicesByModule_auditLog_query_g_1.StatsTopHttpServicesByModuleAuditLogQuery());
        if (r.code !== 0)
            throw new common_1.BadRequestException(r.message);
        return r.value;
    }
};
exports.AuditLogsController = AuditLogsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ operationId: 'AuditLogsList' }),
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
], AuditLogsController.prototype, "listAsync", null);
__decorate([
    (0, common_1.Get)('count'),
    (0, swagger_1.ApiOperation)({ operationId: 'AuditLogsCount' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuditLogsController.prototype, "countAsync", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ operationId: 'AuditLogsGetItem' }),
    (0, swagger_1.ApiParam)({ name: 'id', required: true, type: String, format: 'uuid' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: auditLog_dto_g_1.AuditLogDto }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuditLogsController.prototype, "getItemAsync", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ operationId: 'AuditLogsInsert' }),
    (0, swagger_1.ApiResponse)({ status: 201, type: auditLog_dto_g_1.AuditLogDto }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auditLog_dto_g_1.AuditLogDto]),
    __metadata("design:returntype", Promise)
], AuditLogsController.prototype, "insertAsync", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ operationId: 'AuditLogsUpdate' }),
    (0, swagger_1.ApiParam)({ name: 'id', required: true, type: String, format: 'uuid' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: Boolean }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, auditLog_dto_g_1.AuditLogDto]),
    __metadata("design:returntype", Promise)
], AuditLogsController.prototype, "updateAsync", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ operationId: 'AuditLogsDelete' }),
    (0, swagger_1.ApiParam)({ name: 'id', required: true, type: String, format: 'uuid' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: Boolean }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuditLogsController.prototype, "deleteAsync", null);
__decorate([
    (0, common_1.Get)('get-recent-http-requests'),
    (0, swagger_1.ApiOperation)({ operationId: 'AuditLogsGetRecentHttpRequests' }),
    (0, swagger_1.ApiQuery)({ name: 'pageNumber', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'pageSize', required: false, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, type: auditLog_getRecentHttpRequests_response_dto_g_1.AuditLogGetRecentHttpRequestsResponseDto, isArray: true }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __param(0, (0, common_1.Query)('pageNumber')),
    __param(1, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", Promise)
], AuditLogsController.prototype, "getRecentHttpRequestsAsync", null);
__decorate([
    (0, common_1.Get)('get-recent-http-requests-by-module'),
    (0, swagger_1.ApiOperation)({ operationId: 'AuditLogsGetRecentHttpRequestsByModule' }),
    (0, swagger_1.ApiQuery)({ name: 'requestModule', required: true, type: String }),
    (0, swagger_1.ApiQuery)({ name: 'pageNumber', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'pageSize', required: false, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, type: auditLog_getRecentHttpRequestsByModule_response_dto_g_1.AuditLogGetRecentHttpRequestsByModuleResponseDto, isArray: true }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __param(0, (0, common_1.Query)('requestModule')),
    __param(1, (0, common_1.Query)('pageNumber')),
    __param(2, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", Promise)
], AuditLogsController.prototype, "getRecentHttpRequestsByModuleAsync", null);
__decorate([
    (0, common_1.Get)('stats-today-http-requests'),
    (0, swagger_1.ApiOperation)({ operationId: 'AuditLogsStatsTodayHttpRequests' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: auditLog_statsTodayHttpRequests_response_dto_g_1.AuditLogStatsTodayHttpRequestsResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuditLogsController.prototype, "statsTodayHttpRequestsAsync", null);
__decorate([
    (0, common_1.Get)('stats-last-hour-http-requests'),
    (0, swagger_1.ApiOperation)({ operationId: 'AuditLogsStatsLastHourHttpRequests' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: auditLog_statsLastHourHttpRequests_response_dto_g_1.AuditLogStatsLastHourHttpRequestsResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuditLogsController.prototype, "statsLastHourHttpRequestsAsync", null);
__decorate([
    (0, common_1.Get)('stats-yesterday-http-requests'),
    (0, swagger_1.ApiOperation)({ operationId: 'AuditLogsStatsYesterdayHttpRequests' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: auditLog_statsYesterdayHttpRequests_response_dto_g_1.AuditLogStatsYesterdayHttpRequestsResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuditLogsController.prototype, "statsYesterdayHttpRequestsAsync", null);
__decorate([
    (0, common_1.Get)('stats-weekly-http-requests'),
    (0, swagger_1.ApiOperation)({ operationId: 'AuditLogsStatsWeeklyHttpRequests' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: auditLog_statsWeeklyHttpRequests_response_dto_g_1.AuditLogStatsWeeklyHttpRequestsResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuditLogsController.prototype, "statsWeeklyHttpRequestsAsync", null);
__decorate([
    (0, common_1.Get)('stats-monthly-http-requests'),
    (0, swagger_1.ApiOperation)({ operationId: 'AuditLogsStatsMonthlyHttpRequests' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: auditLog_statsMonthlyHttpRequests_response_dto_g_1.AuditLogStatsMonthlyHttpRequestsResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuditLogsController.prototype, "statsMonthlyHttpRequestsAsync", null);
__decorate([
    (0, common_1.Get)('stats-yearly-http-requests'),
    (0, swagger_1.ApiOperation)({ operationId: 'AuditLogsStatsYearlyHttpRequests' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: auditLog_statsYearlyHttpRequests_response_dto_g_1.AuditLogStatsYearlyHttpRequestsResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuditLogsController.prototype, "statsYearlyHttpRequestsAsync", null);
__decorate([
    (0, common_1.Get)('stats-daily-http-requests-by-day'),
    (0, swagger_1.ApiOperation)({ operationId: 'AuditLogsStatsDailyHttpRequestsByDay' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: auditLog_statsDailyHttpRequestsByDay_response_dto_g_1.AuditLogStatsDailyHttpRequestsByDayResponseDto, isArray: true }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuditLogsController.prototype, "statsDailyHttpRequestsByDayAsync", null);
__decorate([
    (0, common_1.Get)('stats-daily-http-requests-by-day-by-module'),
    (0, swagger_1.ApiOperation)({ operationId: 'AuditLogsStatsDailyHttpRequestsByDayByModule' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: auditLog_statsDailyHttpRequestsByDayByModule_response_dto_g_1.AuditLogStatsDailyHttpRequestsByDayByModuleResponseDto, isArray: true }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuditLogsController.prototype, "statsDailyHttpRequestsByDayByModuleAsync", null);
__decorate([
    (0, common_1.Get)('stats-hourly-http-requests-by-module'),
    (0, swagger_1.ApiOperation)({ operationId: 'AuditLogsStatsHourlyHttpRequestsByModule' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: auditLog_statsHourlyHttpRequestsByModule_response_dto_g_1.AuditLogStatsHourlyHttpRequestsByModuleResponseDto, isArray: true }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuditLogsController.prototype, "statsHourlyHttpRequestsByModuleAsync", null);
__decorate([
    (0, common_1.Get)('stats-total-http-requests-by-module'),
    (0, swagger_1.ApiOperation)({ operationId: 'AuditLogsStatsTotalHttpRequestsByModule' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: auditLog_statsTotalHttpRequestsByModule_response_dto_g_1.AuditLogStatsTotalHttpRequestsByModuleResponseDto, isArray: true }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuditLogsController.prototype, "statsTotalHttpRequestsByModuleAsync", null);
__decorate([
    (0, common_1.Get)('stats-http-status-codes-last24-hours-by-module'),
    (0, swagger_1.ApiOperation)({ operationId: 'AuditLogsStatsHttpStatusCodesLast24HoursByModule' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: auditLog_statsHttpStatusCodesLast24HoursByModule_response_dto_g_1.AuditLogStatsHttpStatusCodesLast24HoursByModuleResponseDto, isArray: true }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuditLogsController.prototype, "statsHttpStatusCodesLast24HoursByModuleAsync", null);
__decorate([
    (0, common_1.Get)('stats-http-status-codes'),
    (0, swagger_1.ApiOperation)({ operationId: 'AuditLogsStatsHttpStatusCodes' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: auditLog_statsHttpStatusCodes_response_dto_g_1.AuditLogStatsHttpStatusCodesResponseDto, isArray: true }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuditLogsController.prototype, "statsHttpStatusCodesAsync", null);
__decorate([
    (0, common_1.Get)('stats-http-status-codes-by-module'),
    (0, swagger_1.ApiOperation)({ operationId: 'AuditLogsStatsHttpStatusCodesByModule' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: auditLog_statsHttpStatusCodesByModule_response_dto_g_1.AuditLogStatsHttpStatusCodesByModuleResponseDto, isArray: true }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuditLogsController.prototype, "statsHttpStatusCodesByModuleAsync", null);
__decorate([
    (0, common_1.Get)('stats-top-http-services-by-module'),
    (0, swagger_1.ApiOperation)({ operationId: 'AuditLogsStatsTopHttpServicesByModule' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: auditLog_statsTopHttpServicesByModule_response_dto_g_1.AuditLogStatsTopHttpServicesByModuleResponseDto, isArray: true }),
    (0, swagger_1.ApiResponse)({ status: 404, type: String }),
    (0, swagger_1.ApiResponse)({ status: 400, type: String }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuditLogsController.prototype, "statsTopHttpServicesByModuleAsync", null);
exports.AuditLogsController = AuditLogsController = __decorate([
    (0, swagger_1.ApiTags)('AuditLogs'),
    (0, swagger_1.ApiBearerAuth)('Bearer'),
    (0, common_1.Controller)('api/pricing-engine-module/audit-logs'),
    __metadata("design:paramtypes", [cqrs_1.QueryBus,
        cqrs_1.CommandBus])
], AuditLogsController);
//# sourceMappingURL=auditLog.controller.g.js.map