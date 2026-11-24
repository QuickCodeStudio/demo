"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const testing_1 = require("@nestjs/testing");
const swagger_1 = require("@nestjs/swagger");
const commissionModel_controller_g_1 = require("./controllers/commissionModel.controller.g");
const commissionModel_dto_g_1 = require("./dto/commissionModel.dto.g");
const commissionModel_getActive_response_dto_g_1 = require("./dto/commissionModel.getActive.response.dto.g");
const commissionModel_getByName_response_dto_g_1 = require("./dto/commissionModel.getByName.response.dto.g");
const commissionModel_deactivate_request_dto_g_1 = require("./dto/commissionModel.deactivate.request.dto.g");
const commissionRule_controller_g_1 = require("./controllers/commissionRule.controller.g");
const commissionRule_dto_g_1 = require("./dto/commissionRule.dto.g");
const commissionRule_getByModelId_response_dto_g_1 = require("./dto/commissionRule.getByModelId.response.dto.g");
const commissionRule_getActiveRulesByModel_response_dto_g_1 = require("./dto/commissionRule.getActiveRulesByModel.response.dto.g");
const commissionRule_deactivate_request_dto_g_1 = require("./dto/commissionRule.deactivate.request.dto.g");
const sellerCommissionAssignment_controller_g_1 = require("./controllers/sellerCommissionAssignment.controller.g");
const sellerCommissionAssignment_dto_g_1 = require("./dto/sellerCommissionAssignment.dto.g");
const sellerCommissionAssignment_getBySellerId_response_dto_g_1 = require("./dto/sellerCommissionAssignment.getBySellerId.response.dto.g");
const sellerCommissionAssignment_getByModelId_response_dto_g_1 = require("./dto/sellerCommissionAssignment.getByModelId.response.dto.g");
const categoryCommissionOverride_controller_g_1 = require("./controllers/categoryCommissionOverride.controller.g");
const categoryCommissionOverride_dto_g_1 = require("./dto/categoryCommissionOverride.dto.g");
const categoryCommissionOverride_getByCategoryId_response_dto_g_1 = require("./dto/categoryCommissionOverride.getByCategoryId.response.dto.g");
const promotionalCampaign_controller_g_1 = require("./controllers/promotionalCampaign.controller.g");
const promotionalCampaign_dto_g_1 = require("./dto/promotionalCampaign.dto.g");
const promotionalCampaign_getActiveCampaigns_response_dto_g_1 = require("./dto/promotionalCampaign.getActiveCampaigns.response.dto.g");
const promotionalCampaign_getCampaignsInDateRange_response_dto_g_1 = require("./dto/promotionalCampaign.getCampaignsInDateRange.response.dto.g");
const promotionalCampaign_deactivate_request_dto_g_1 = require("./dto/promotionalCampaign.deactivate.request.dto.g");
const campaignApplicability_controller_g_1 = require("./controllers/campaignApplicability.controller.g");
const campaignApplicability_dto_g_1 = require("./dto/campaignApplicability.dto.g");
const campaignApplicability_getByCampaignId_response_dto_g_1 = require("./dto/campaignApplicability.getByCampaignId.response.dto.g");
const auditLog_controller_g_1 = require("./controllers/auditLog.controller.g");
const auditLog_dto_g_1 = require("./dto/auditLog.dto.g");
const auditLog_getRecentHttpRequests_response_dto_g_1 = require("./dto/auditLog.getRecentHttpRequests.response.dto.g");
const auditLog_getRecentHttpRequestsByModule_response_dto_g_1 = require("./dto/auditLog.getRecentHttpRequestsByModule.response.dto.g");
const auditLog_statsTodayHttpRequests_response_dto_g_1 = require("./dto/auditLog.statsTodayHttpRequests.response.dto.g");
const auditLog_statsLastHourHttpRequests_response_dto_g_1 = require("./dto/auditLog.statsLastHourHttpRequests.response.dto.g");
const auditLog_statsYesterdayHttpRequests_response_dto_g_1 = require("./dto/auditLog.statsYesterdayHttpRequests.response.dto.g");
const auditLog_statsWeeklyHttpRequests_response_dto_g_1 = require("./dto/auditLog.statsWeeklyHttpRequests.response.dto.g");
const auditLog_statsMonthlyHttpRequests_response_dto_g_1 = require("./dto/auditLog.statsMonthlyHttpRequests.response.dto.g");
const auditLog_statsYearlyHttpRequests_response_dto_g_1 = require("./dto/auditLog.statsYearlyHttpRequests.response.dto.g");
const auditLog_statsDailyHttpRequestsByDay_response_dto_g_1 = require("./dto/auditLog.statsDailyHttpRequestsByDay.response.dto.g");
const auditLog_statsDailyHttpRequestsByDayByModule_response_dto_g_1 = require("./dto/auditLog.statsDailyHttpRequestsByDayByModule.response.dto.g");
const auditLog_statsHourlyHttpRequestsByModule_response_dto_g_1 = require("./dto/auditLog.statsHourlyHttpRequestsByModule.response.dto.g");
const auditLog_statsTotalHttpRequestsByModule_response_dto_g_1 = require("./dto/auditLog.statsTotalHttpRequestsByModule.response.dto.g");
const auditLog_statsHttpStatusCodesLast24HoursByModule_response_dto_g_1 = require("./dto/auditLog.statsHttpStatusCodesLast24HoursByModule.response.dto.g");
const auditLog_statsHttpStatusCodes_response_dto_g_1 = require("./dto/auditLog.statsHttpStatusCodes.response.dto.g");
const auditLog_statsHttpStatusCodesByModule_response_dto_g_1 = require("./dto/auditLog.statsHttpStatusCodesByModule.response.dto.g");
const auditLog_statsTopHttpServicesByModule_response_dto_g_1 = require("./dto/auditLog.statsTopHttpServicesByModule.response.dto.g");
const DTO_SCHEMA_IDS = {
    CommissionModelDto: 'QuickCode.Demo.PricingEngineModule.Application.Dtos.CommissionModel.CommissionModelDto',
    CommissionModelGetActiveResponseDto: 'QuickCode.Demo.PricingEngineModule.Application.Dtos.CommissionModel.GetActiveResponseDto',
    CommissionModelGetByNameResponseDto: 'QuickCode.Demo.PricingEngineModule.Application.Dtos.CommissionModel.GetByNameResponseDto',
    CommissionModelDeactivateRequestDto: 'QuickCode.Demo.PricingEngineModule.Application.Dtos.CommissionModel.DeactivateRequestDto',
    CommissionRuleDto: 'QuickCode.Demo.PricingEngineModule.Application.Dtos.CommissionRule.CommissionRuleDto',
    CommissionRuleGetByModelIdResponseDto: 'QuickCode.Demo.PricingEngineModule.Application.Dtos.CommissionRule.GetByModelIdResponseDto',
    CommissionRuleGetActiveRulesByModelResponseDto: 'QuickCode.Demo.PricingEngineModule.Application.Dtos.CommissionRule.GetActiveRulesByModelResponseDto',
    CommissionRuleDeactivateRequestDto: 'QuickCode.Demo.PricingEngineModule.Application.Dtos.CommissionRule.DeactivateRequestDto',
    SellerCommissionAssignmentDto: 'QuickCode.Demo.PricingEngineModule.Application.Dtos.SellerCommissionAssignment.SellerCommissionAssignmentDto',
    SellerCommissionAssignmentGetBySellerIdResponseDto: 'QuickCode.Demo.PricingEngineModule.Application.Dtos.SellerCommissionAssignment.GetBySellerIdResponseDto',
    SellerCommissionAssignmentGetByModelIdResponseDto: 'QuickCode.Demo.PricingEngineModule.Application.Dtos.SellerCommissionAssignment.GetByModelIdResponseDto',
    CategoryCommissionOverrideDto: 'QuickCode.Demo.PricingEngineModule.Application.Dtos.CategoryCommissionOverride.CategoryCommissionOverrideDto',
    CategoryCommissionOverrideGetByCategoryIdResponseDto: 'QuickCode.Demo.PricingEngineModule.Application.Dtos.CategoryCommissionOverride.GetByCategoryIdResponseDto',
    PromotionalCampaignDto: 'QuickCode.Demo.PricingEngineModule.Application.Dtos.PromotionalCampaign.PromotionalCampaignDto',
    PromotionalCampaignGetActiveCampaignsResponseDto: 'QuickCode.Demo.PricingEngineModule.Application.Dtos.PromotionalCampaign.GetActiveCampaignsResponseDto',
    PromotionalCampaignGetCampaignsInDateRangeResponseDto: 'QuickCode.Demo.PricingEngineModule.Application.Dtos.PromotionalCampaign.GetCampaignsInDateRangeResponseDto',
    PromotionalCampaignDeactivateRequestDto: 'QuickCode.Demo.PricingEngineModule.Application.Dtos.PromotionalCampaign.DeactivateRequestDto',
    CampaignApplicabilityDto: 'QuickCode.Demo.PricingEngineModule.Application.Dtos.CampaignApplicability.CampaignApplicabilityDto',
    CampaignApplicabilityGetByCampaignIdResponseDto: 'QuickCode.Demo.PricingEngineModule.Application.Dtos.CampaignApplicability.GetByCampaignIdResponseDto',
    AuditLogDto: 'QuickCode.Demo.PricingEngineModule.Application.Dtos.AuditLog.AuditLogDto',
    AuditLogGetRecentHttpRequestsResponseDto: 'QuickCode.Demo.PricingEngineModule.Application.Dtos.AuditLog.GetRecentHttpRequestsResponseDto',
    AuditLogGetRecentHttpRequestsByModuleResponseDto: 'QuickCode.Demo.PricingEngineModule.Application.Dtos.AuditLog.GetRecentHttpRequestsByModuleResponseDto',
    AuditLogStatsTodayHttpRequestsResponseDto: 'QuickCode.Demo.PricingEngineModule.Application.Dtos.AuditLog.StatsTodayHttpRequestsResponseDto',
    AuditLogStatsLastHourHttpRequestsResponseDto: 'QuickCode.Demo.PricingEngineModule.Application.Dtos.AuditLog.StatsLastHourHttpRequestsResponseDto',
    AuditLogStatsYesterdayHttpRequestsResponseDto: 'QuickCode.Demo.PricingEngineModule.Application.Dtos.AuditLog.StatsYesterdayHttpRequestsResponseDto',
    AuditLogStatsWeeklyHttpRequestsResponseDto: 'QuickCode.Demo.PricingEngineModule.Application.Dtos.AuditLog.StatsWeeklyHttpRequestsResponseDto',
    AuditLogStatsMonthlyHttpRequestsResponseDto: 'QuickCode.Demo.PricingEngineModule.Application.Dtos.AuditLog.StatsMonthlyHttpRequestsResponseDto',
    AuditLogStatsYearlyHttpRequestsResponseDto: 'QuickCode.Demo.PricingEngineModule.Application.Dtos.AuditLog.StatsYearlyHttpRequestsResponseDto',
    AuditLogStatsDailyHttpRequestsByDayResponseDto: 'QuickCode.Demo.PricingEngineModule.Application.Dtos.AuditLog.StatsDailyHttpRequestsByDayResponseDto',
    AuditLogStatsDailyHttpRequestsByDayByModuleResponseDto: 'QuickCode.Demo.PricingEngineModule.Application.Dtos.AuditLog.StatsDailyHttpRequestsByDayByModuleResponseDto',
    AuditLogStatsHourlyHttpRequestsByModuleResponseDto: 'QuickCode.Demo.PricingEngineModule.Application.Dtos.AuditLog.StatsHourlyHttpRequestsByModuleResponseDto',
    AuditLogStatsTotalHttpRequestsByModuleResponseDto: 'QuickCode.Demo.PricingEngineModule.Application.Dtos.AuditLog.StatsTotalHttpRequestsByModuleResponseDto',
    AuditLogStatsHttpStatusCodesLast24HoursByModuleResponseDto: 'QuickCode.Demo.PricingEngineModule.Application.Dtos.AuditLog.StatsHttpStatusCodesLast24HoursByModuleResponseDto',
    AuditLogStatsHttpStatusCodesResponseDto: 'QuickCode.Demo.PricingEngineModule.Application.Dtos.AuditLog.StatsHttpStatusCodesResponseDto',
    AuditLogStatsHttpStatusCodesByModuleResponseDto: 'QuickCode.Demo.PricingEngineModule.Application.Dtos.AuditLog.StatsHttpStatusCodesByModuleResponseDto',
    AuditLogStatsTopHttpServicesByModuleResponseDto: 'QuickCode.Demo.PricingEngineModule.Application.Dtos.AuditLog.StatsTopHttpServicesByModuleResponseDto',
};
const ENUM_SCHEMAS = {
    CommissionType: { id: 'QuickCode.Demo.PricingEngineModule.Domain.Enums.CommissionType', values: ['Percentage', 'FixedAmount', 'Mixed'] },
    RuleScope: { id: 'QuickCode.Demo.PricingEngineModule.Domain.Enums.RuleScope', values: ['Global', 'SellerTier', 'Category', 'Seller'] },
};
const LIST_RESULT_PATHS = {
    '/api/pricing-engine-module/commission-models': 'ListResultOfCommissionModelDto',
    '/api/pricing-engine-module/commission-rules': 'ListResultOfCommissionRuleDto',
    '/api/pricing-engine-module/seller-commission-assignments': 'ListResultOfSellerCommissionAssignmentDto',
    '/api/pricing-engine-module/category-commission-overrides': 'ListResultOfCategoryCommissionOverrideDto',
    '/api/pricing-engine-module/promotional-campaigns': 'ListResultOfPromotionalCampaignDto',
    '/api/pricing-engine-module/campaign-applicabilities': 'ListResultOfCampaignApplicabilityDto',
    '/api/pricing-engine-module/audit-logs': 'ListResultOfAuditLogDto',
};
const FILTER_RESPONSE_PATHS = {
    '/api/pricing-engine-module/commission-models/get-active': { schema: 'CommissionModelGetActiveResponseDto', isArray: true },
    '/api/pricing-engine-module/commission-models/get-by-name': { schema: 'CommissionModelGetByNameResponseDto', isArray: false },
    '/api/pricing-engine-module/commission-rules/get-by-model-id': { schema: 'CommissionRuleGetByModelIdResponseDto', isArray: true },
    '/api/pricing-engine-module/commission-rules/get-active-rules-by-model': { schema: 'CommissionRuleGetActiveRulesByModelResponseDto', isArray: true },
    '/api/pricing-engine-module/seller-commission-assignments/get-by-seller-id': { schema: 'SellerCommissionAssignmentGetBySellerIdResponseDto', isArray: false },
    '/api/pricing-engine-module/seller-commission-assignments/get-by-model-id': { schema: 'SellerCommissionAssignmentGetByModelIdResponseDto', isArray: true },
    '/api/pricing-engine-module/category-commission-overrides/get-by-category-id': { schema: 'CategoryCommissionOverrideGetByCategoryIdResponseDto', isArray: false },
    '/api/pricing-engine-module/promotional-campaigns/get-active-campaigns': { schema: 'PromotionalCampaignGetActiveCampaignsResponseDto', isArray: true },
    '/api/pricing-engine-module/promotional-campaigns/get-campaigns-in-date-range': { schema: 'PromotionalCampaignGetCampaignsInDateRangeResponseDto', isArray: true },
    '/api/pricing-engine-module/campaign-applicabilities/get-by-campaign-id': { schema: 'CampaignApplicabilityGetByCampaignIdResponseDto', isArray: true },
    '/api/pricing-engine-module/audit-logs/get-recent-http-requests': { schema: 'AuditLogGetRecentHttpRequestsResponseDto', isArray: true },
    '/api/pricing-engine-module/audit-logs/get-recent-http-requests-by-module': { schema: 'AuditLogGetRecentHttpRequestsByModuleResponseDto', isArray: true },
    '/api/pricing-engine-module/audit-logs/stats-today-http-requests': { schema: 'AuditLogStatsTodayHttpRequestsResponseDto', isArray: false },
    '/api/pricing-engine-module/audit-logs/stats-last-hour-http-requests': { schema: 'AuditLogStatsLastHourHttpRequestsResponseDto', isArray: false },
    '/api/pricing-engine-module/audit-logs/stats-yesterday-http-requests': { schema: 'AuditLogStatsYesterdayHttpRequestsResponseDto', isArray: false },
    '/api/pricing-engine-module/audit-logs/stats-weekly-http-requests': { schema: 'AuditLogStatsWeeklyHttpRequestsResponseDto', isArray: false },
    '/api/pricing-engine-module/audit-logs/stats-monthly-http-requests': { schema: 'AuditLogStatsMonthlyHttpRequestsResponseDto', isArray: false },
    '/api/pricing-engine-module/audit-logs/stats-yearly-http-requests': { schema: 'AuditLogStatsYearlyHttpRequestsResponseDto', isArray: false },
    '/api/pricing-engine-module/audit-logs/stats-daily-http-requests-by-day': { schema: 'AuditLogStatsDailyHttpRequestsByDayResponseDto', isArray: true },
    '/api/pricing-engine-module/audit-logs/stats-daily-http-requests-by-day-by-module': { schema: 'AuditLogStatsDailyHttpRequestsByDayByModuleResponseDto', isArray: true },
    '/api/pricing-engine-module/audit-logs/stats-hourly-http-requests-by-module': { schema: 'AuditLogStatsHourlyHttpRequestsByModuleResponseDto', isArray: true },
    '/api/pricing-engine-module/audit-logs/stats-total-http-requests-by-module': { schema: 'AuditLogStatsTotalHttpRequestsByModuleResponseDto', isArray: true },
    '/api/pricing-engine-module/audit-logs/stats-http-status-codes-last24-hours-by-module': { schema: 'AuditLogStatsHttpStatusCodesLast24HoursByModuleResponseDto', isArray: true },
    '/api/pricing-engine-module/audit-logs/stats-http-status-codes': { schema: 'AuditLogStatsHttpStatusCodesResponseDto', isArray: true },
    '/api/pricing-engine-module/audit-logs/stats-http-status-codes-by-module': { schema: 'AuditLogStatsHttpStatusCodesByModuleResponseDto', isArray: true },
    '/api/pricing-engine-module/audit-logs/stats-top-http-services-by-module': { schema: 'AuditLogStatsTopHttpServicesByModuleResponseDto', isArray: true },
};
function rewriteRefs(value, rename) {
    if (Array.isArray(value))
        return value.map((item) => rewriteRefs(item, rename));
    if (!value || typeof value !== 'object')
        return value;
    const record = value;
    const next = {};
    for (const [key, child] of Object.entries(record)) {
        if (key === '$ref' && typeof child === 'string') {
            const name = child.split('/').pop() ?? child;
            next[key] = rename[name] ? `#/components/schemas/${rename[name]}` : child;
        }
        else {
            next[key] = rewriteRefs(child, rename);
        }
    }
    return next;
}
function alignOpenApi(doc) {
    const title = process.env.SWAGGER_TITLE ?? 'QuickCode - Demo - PricingEngineModule Api (1.0.0.0)';
    const info = {
        title,
        termsOfService: 'https://www.quickcode.net',
        contact: { name: 'Üzeyir Apaydın', url: 'https://www.quickcode.net' },
        license: { name: 'QuickCode.Net License', url: 'https://www.quickcode.net' },
        version: 'v1',
    };
    const components = { ...(doc.components ?? {}) };
    const schemas = { ...(components.schemas ?? {}) };
    delete schemas.ListResult;
    const rename = { ...DTO_SCHEMA_IDS };
    for (const [shortName, spec] of Object.entries(ENUM_SCHEMAS)) {
        rename[shortName] = spec.id;
        schemas[spec.id] = {
            type: 'string',
            enum: spec.values,
            'x-enumNames': spec.values,
            'x-enum-varnames': spec.values,
            'x-enumDescriptions': spec.values,
        };
        delete schemas[shortName];
    }
    for (const [shortName, longName] of Object.entries(DTO_SCHEMA_IDS)) {
        if (schemas[shortName]) {
            const schema = schemas[shortName];
            schema.additionalProperties = false;
            schemas[longName] = schema;
            delete schemas[shortName];
        }
    }
    for (const listPath of Object.keys(LIST_RESULT_PATHS)) {
        const listName = LIST_RESULT_PATHS[listPath];
        const className = listName.replace(/^ListResultOf/, '').replace(/Dto$/, '');
        const longName = DTO_SCHEMA_IDS[`${className}Dto`];
        if (!longName)
            continue;
        schemas[listName] = {
            title: listName,
            type: 'object',
            additionalProperties: false,
            properties: {
                items: {
                    title: `ListOf${className}Dto`,
                    type: 'array',
                    nullable: true,
                    items: { $ref: `#/components/schemas/${longName}` },
                },
                totalCount: { title: 'NullableOfInt32', type: 'integer', format: 'int32', nullable: true },
            },
        };
    }
    components.schemas = rewriteRefs(schemas, rename);
    components.securitySchemes = {
        Bearer: {
            type: 'http',
            description: 'Please enter a valid token',
            scheme: 'Bearer',
            bearerFormat: 'Bearer',
        },
    };
    const paths = rewriteRefs(doc.paths, rename);
    for (const [path, methods] of Object.entries(paths ?? {})) {
        for (const op of Object.values(methods ?? {})) {
            if (!op || typeof op !== 'object')
                continue;
            op.security = [{ Bearer: [] }];
        }
        const listSchema = LIST_RESULT_PATHS[path];
        const getOp = methods?.get;
        if (listSchema && getOp) {
            const responses = (getOp.responses ?? {});
            responses['200'] = {
                description: 'OK',
                content: { 'application/json': { schema: { $ref: `#/components/schemas/${listSchema}` } } },
            };
            getOp.responses = responses;
        }
        const filterMeta = FILTER_RESPONSE_PATHS[path];
        if (filterMeta && getOp) {
            const longName = rename[filterMeta.schema] ?? filterMeta.schema;
            const responses = (getOp.responses ?? {});
            const schema = filterMeta.isArray
                ? { type: 'array', items: { $ref: `#/components/schemas/${longName}` } }
                : { $ref: `#/components/schemas/${longName}` };
            responses['200'] = {
                description: 'OK',
                content: { 'application/json': { schema } },
            };
            getOp.responses = responses;
        }
    }
    return {
        openapi: '3.0.4',
        info,
        paths,
        components,
        security: [{ Bearer: [] }],
    };
}
async function dump() {
    const out = process.env.SWAGGER_OUT;
    if (!out)
        throw new Error('SWAGGER_OUT is required');
    const moduleRef = await testing_1.Test.createTestingModule({
        controllers: [commissionModel_controller_g_1.CommissionModelsController, commissionRule_controller_g_1.CommissionRulesController, sellerCommissionAssignment_controller_g_1.SellerCommissionAssignmentsController, categoryCommissionOverride_controller_g_1.CategoryCommissionOverridesController, promotionalCampaign_controller_g_1.PromotionalCampaignsController, campaignApplicability_controller_g_1.CampaignApplicabilitiesController, auditLog_controller_g_1.AuditLogsController],
    })
        .useMocker(() => ({}))
        .compile();
    const app = moduleRef.createNestApplication();
    await app.init();
    const title = process.env.SWAGGER_TITLE ?? 'QuickCode - Demo - PricingEngineModule Api (1.0.0.0)';
    const config = new swagger_1.DocumentBuilder()
        .setTitle(title)
        .setVersion('v1')
        .setTermsOfService('https://www.quickcode.net')
        .setContact('Üzeyir Apaydın', 'https://www.quickcode.net', '')
        .setLicense('QuickCode.Net License', 'https://www.quickcode.net')
        .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'Bearer', description: 'Please enter a valid token' }, 'Bearer')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config, {
        extraModels: [commissionModel_dto_g_1.CommissionModelDto, commissionModel_getActive_response_dto_g_1.CommissionModelGetActiveResponseDto, commissionModel_getByName_response_dto_g_1.CommissionModelGetByNameResponseDto, commissionModel_deactivate_request_dto_g_1.CommissionModelDeactivateRequestDto, commissionRule_dto_g_1.CommissionRuleDto, commissionRule_getByModelId_response_dto_g_1.CommissionRuleGetByModelIdResponseDto, commissionRule_getActiveRulesByModel_response_dto_g_1.CommissionRuleGetActiveRulesByModelResponseDto, commissionRule_deactivate_request_dto_g_1.CommissionRuleDeactivateRequestDto, sellerCommissionAssignment_dto_g_1.SellerCommissionAssignmentDto, sellerCommissionAssignment_getBySellerId_response_dto_g_1.SellerCommissionAssignmentGetBySellerIdResponseDto, sellerCommissionAssignment_getByModelId_response_dto_g_1.SellerCommissionAssignmentGetByModelIdResponseDto, categoryCommissionOverride_dto_g_1.CategoryCommissionOverrideDto, categoryCommissionOverride_getByCategoryId_response_dto_g_1.CategoryCommissionOverrideGetByCategoryIdResponseDto, promotionalCampaign_dto_g_1.PromotionalCampaignDto, promotionalCampaign_getActiveCampaigns_response_dto_g_1.PromotionalCampaignGetActiveCampaignsResponseDto, promotionalCampaign_getCampaignsInDateRange_response_dto_g_1.PromotionalCampaignGetCampaignsInDateRangeResponseDto, promotionalCampaign_deactivate_request_dto_g_1.PromotionalCampaignDeactivateRequestDto, campaignApplicability_dto_g_1.CampaignApplicabilityDto, campaignApplicability_getByCampaignId_response_dto_g_1.CampaignApplicabilityGetByCampaignIdResponseDto, auditLog_dto_g_1.AuditLogDto, auditLog_getRecentHttpRequests_response_dto_g_1.AuditLogGetRecentHttpRequestsResponseDto, auditLog_getRecentHttpRequestsByModule_response_dto_g_1.AuditLogGetRecentHttpRequestsByModuleResponseDto, auditLog_statsTodayHttpRequests_response_dto_g_1.AuditLogStatsTodayHttpRequestsResponseDto, auditLog_statsLastHourHttpRequests_response_dto_g_1.AuditLogStatsLastHourHttpRequestsResponseDto, auditLog_statsYesterdayHttpRequests_response_dto_g_1.AuditLogStatsYesterdayHttpRequestsResponseDto, auditLog_statsWeeklyHttpRequests_response_dto_g_1.AuditLogStatsWeeklyHttpRequestsResponseDto, auditLog_statsMonthlyHttpRequests_response_dto_g_1.AuditLogStatsMonthlyHttpRequestsResponseDto, auditLog_statsYearlyHttpRequests_response_dto_g_1.AuditLogStatsYearlyHttpRequestsResponseDto, auditLog_statsDailyHttpRequestsByDay_response_dto_g_1.AuditLogStatsDailyHttpRequestsByDayResponseDto, auditLog_statsDailyHttpRequestsByDayByModule_response_dto_g_1.AuditLogStatsDailyHttpRequestsByDayByModuleResponseDto, auditLog_statsHourlyHttpRequestsByModule_response_dto_g_1.AuditLogStatsHourlyHttpRequestsByModuleResponseDto, auditLog_statsTotalHttpRequestsByModule_response_dto_g_1.AuditLogStatsTotalHttpRequestsByModuleResponseDto, auditLog_statsHttpStatusCodesLast24HoursByModule_response_dto_g_1.AuditLogStatsHttpStatusCodesLast24HoursByModuleResponseDto, auditLog_statsHttpStatusCodes_response_dto_g_1.AuditLogStatsHttpStatusCodesResponseDto, auditLog_statsHttpStatusCodesByModule_response_dto_g_1.AuditLogStatsHttpStatusCodesByModuleResponseDto, auditLog_statsTopHttpServicesByModule_response_dto_g_1.AuditLogStatsTopHttpServicesByModuleResponseDto],
        operationIdFactory: (controllerKey, methodKey) => {
            const controller = controllerKey.replace(/Controller$/, '');
            const action = methodKey.replace(/Async$/i, '');
            return `${controller}${action.charAt(0).toUpperCase()}${action.slice(1)}`;
        },
    });
    const aligned = alignOpenApi(document);
    (0, fs_1.mkdirSync)((0, path_1.dirname)(out), { recursive: true });
    (0, fs_1.writeFileSync)(out, JSON.stringify(aligned, null, 2));
    await app.close();
}
dump().catch((err) => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=swagger-dump.g.js.map