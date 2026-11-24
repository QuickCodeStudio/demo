"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingEngineModuleModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const cqrs_1 = require("@nestjs/cqrs");
const commissionModel_entity_g_1 = require("./entities/commissionModel.entity.g");
const commissionRule_entity_g_1 = require("./entities/commissionRule.entity.g");
const sellerCommissionAssignment_entity_g_1 = require("./entities/sellerCommissionAssignment.entity.g");
const categoryCommissionOverride_entity_g_1 = require("./entities/categoryCommissionOverride.entity.g");
const promotionalCampaign_entity_g_1 = require("./entities/promotionalCampaign.entity.g");
const campaignApplicability_entity_g_1 = require("./entities/campaignApplicability.entity.g");
const auditLog_entity_g_1 = require("./entities/auditLog.entity.g");
const commissionModel_repository_g_1 = require("./repositories/commissionModel.repository.g");
const commissionRule_repository_g_1 = require("./repositories/commissionRule.repository.g");
const sellerCommissionAssignment_repository_g_1 = require("./repositories/sellerCommissionAssignment.repository.g");
const categoryCommissionOverride_repository_g_1 = require("./repositories/categoryCommissionOverride.repository.g");
const promotionalCampaign_repository_g_1 = require("./repositories/promotionalCampaign.repository.g");
const campaignApplicability_repository_g_1 = require("./repositories/campaignApplicability.repository.g");
const auditLog_repository_g_1 = require("./repositories/auditLog.repository.g");
const list_commissionModel_query_g_1 = require("./features/queries/commissionModel/list-commissionModel.query.g");
const get_item_commissionModel_query_g_1 = require("./features/queries/commissionModel/get-item-commissionModel.query.g");
const total_item_count_commissionModel_query_g_1 = require("./features/queries/commissionModel/total-item-count-commissionModel.query.g");
const insert_commissionModel_command_g_1 = require("./features/commands/commissionModel/insert-commissionModel.command.g");
const update_commissionModel_command_g_1 = require("./features/commands/commissionModel/update-commissionModel.command.g");
const delete_item_commissionModel_command_g_1 = require("./features/commands/commissionModel/delete-item-commissionModel.command.g");
const getActive_commissionModel_query_g_1 = require("./features/queries/commissionModel/getActive-commissionModel.query.g");
const getByName_commissionModel_query_g_1 = require("./features/queries/commissionModel/getByName-commissionModel.query.g");
const deactivate_commissionModel_command_g_1 = require("./features/commands/commissionModel/deactivate-commissionModel.command.g");
const list_commissionRule_query_g_1 = require("./features/queries/commissionRule/list-commissionRule.query.g");
const get_item_commissionRule_query_g_1 = require("./features/queries/commissionRule/get-item-commissionRule.query.g");
const total_item_count_commissionRule_query_g_1 = require("./features/queries/commissionRule/total-item-count-commissionRule.query.g");
const insert_commissionRule_command_g_1 = require("./features/commands/commissionRule/insert-commissionRule.command.g");
const update_commissionRule_command_g_1 = require("./features/commands/commissionRule/update-commissionRule.command.g");
const delete_item_commissionRule_command_g_1 = require("./features/commands/commissionRule/delete-item-commissionRule.command.g");
const getByModelId_commissionRule_query_g_1 = require("./features/queries/commissionRule/getByModelId-commissionRule.query.g");
const getActiveRulesByModel_commissionRule_query_g_1 = require("./features/queries/commissionRule/getActiveRulesByModel-commissionRule.query.g");
const deactivate_commissionRule_command_g_1 = require("./features/commands/commissionRule/deactivate-commissionRule.command.g");
const list_sellerCommissionAssignment_query_g_1 = require("./features/queries/sellerCommissionAssignment/list-sellerCommissionAssignment.query.g");
const get_item_sellerCommissionAssignment_query_g_1 = require("./features/queries/sellerCommissionAssignment/get-item-sellerCommissionAssignment.query.g");
const total_item_count_sellerCommissionAssignment_query_g_1 = require("./features/queries/sellerCommissionAssignment/total-item-count-sellerCommissionAssignment.query.g");
const insert_sellerCommissionAssignment_command_g_1 = require("./features/commands/sellerCommissionAssignment/insert-sellerCommissionAssignment.command.g");
const update_sellerCommissionAssignment_command_g_1 = require("./features/commands/sellerCommissionAssignment/update-sellerCommissionAssignment.command.g");
const delete_item_sellerCommissionAssignment_command_g_1 = require("./features/commands/sellerCommissionAssignment/delete-item-sellerCommissionAssignment.command.g");
const getBySellerId_sellerCommissionAssignment_query_g_1 = require("./features/queries/sellerCommissionAssignment/getBySellerId-sellerCommissionAssignment.query.g");
const getByModelId_sellerCommissionAssignment_query_g_1 = require("./features/queries/sellerCommissionAssignment/getByModelId-sellerCommissionAssignment.query.g");
const removeAssignment_sellerCommissionAssignment_command_g_1 = require("./features/commands/sellerCommissionAssignment/removeAssignment-sellerCommissionAssignment.command.g");
const list_categoryCommissionOverride_query_g_1 = require("./features/queries/categoryCommissionOverride/list-categoryCommissionOverride.query.g");
const get_item_categoryCommissionOverride_query_g_1 = require("./features/queries/categoryCommissionOverride/get-item-categoryCommissionOverride.query.g");
const total_item_count_categoryCommissionOverride_query_g_1 = require("./features/queries/categoryCommissionOverride/total-item-count-categoryCommissionOverride.query.g");
const insert_categoryCommissionOverride_command_g_1 = require("./features/commands/categoryCommissionOverride/insert-categoryCommissionOverride.command.g");
const update_categoryCommissionOverride_command_g_1 = require("./features/commands/categoryCommissionOverride/update-categoryCommissionOverride.command.g");
const delete_item_categoryCommissionOverride_command_g_1 = require("./features/commands/categoryCommissionOverride/delete-item-categoryCommissionOverride.command.g");
const getByCategoryId_categoryCommissionOverride_query_g_1 = require("./features/queries/categoryCommissionOverride/getByCategoryId-categoryCommissionOverride.query.g");
const removeOverride_categoryCommissionOverride_command_g_1 = require("./features/commands/categoryCommissionOverride/removeOverride-categoryCommissionOverride.command.g");
const list_promotionalCampaign_query_g_1 = require("./features/queries/promotionalCampaign/list-promotionalCampaign.query.g");
const get_item_promotionalCampaign_query_g_1 = require("./features/queries/promotionalCampaign/get-item-promotionalCampaign.query.g");
const total_item_count_promotionalCampaign_query_g_1 = require("./features/queries/promotionalCampaign/total-item-count-promotionalCampaign.query.g");
const insert_promotionalCampaign_command_g_1 = require("./features/commands/promotionalCampaign/insert-promotionalCampaign.command.g");
const update_promotionalCampaign_command_g_1 = require("./features/commands/promotionalCampaign/update-promotionalCampaign.command.g");
const delete_item_promotionalCampaign_command_g_1 = require("./features/commands/promotionalCampaign/delete-item-promotionalCampaign.command.g");
const getActiveCampaigns_promotionalCampaign_query_g_1 = require("./features/queries/promotionalCampaign/getActiveCampaigns-promotionalCampaign.query.g");
const getCampaignsInDateRange_promotionalCampaign_query_g_1 = require("./features/queries/promotionalCampaign/getCampaignsInDateRange-promotionalCampaign.query.g");
const deactivate_promotionalCampaign_command_g_1 = require("./features/commands/promotionalCampaign/deactivate-promotionalCampaign.command.g");
const list_campaignApplicability_query_g_1 = require("./features/queries/campaignApplicability/list-campaignApplicability.query.g");
const get_item_campaignApplicability_query_g_1 = require("./features/queries/campaignApplicability/get-item-campaignApplicability.query.g");
const total_item_count_campaignApplicability_query_g_1 = require("./features/queries/campaignApplicability/total-item-count-campaignApplicability.query.g");
const insert_campaignApplicability_command_g_1 = require("./features/commands/campaignApplicability/insert-campaignApplicability.command.g");
const update_campaignApplicability_command_g_1 = require("./features/commands/campaignApplicability/update-campaignApplicability.command.g");
const delete_item_campaignApplicability_command_g_1 = require("./features/commands/campaignApplicability/delete-item-campaignApplicability.command.g");
const getByCampaignId_campaignApplicability_query_g_1 = require("./features/queries/campaignApplicability/getByCampaignId-campaignApplicability.query.g");
const removeApplicability_campaignApplicability_command_g_1 = require("./features/commands/campaignApplicability/removeApplicability-campaignApplicability.command.g");
const list_auditLog_query_g_1 = require("./features/queries/auditLog/list-auditLog.query.g");
const get_item_auditLog_query_g_1 = require("./features/queries/auditLog/get-item-auditLog.query.g");
const total_item_count_auditLog_query_g_1 = require("./features/queries/auditLog/total-item-count-auditLog.query.g");
const insert_auditLog_command_g_1 = require("./features/commands/auditLog/insert-auditLog.command.g");
const update_auditLog_command_g_1 = require("./features/commands/auditLog/update-auditLog.command.g");
const delete_item_auditLog_command_g_1 = require("./features/commands/auditLog/delete-item-auditLog.command.g");
const getRecentHttpRequests_auditLog_query_g_1 = require("./features/queries/auditLog/getRecentHttpRequests-auditLog.query.g");
const getRecentHttpRequestsByModule_auditLog_query_g_1 = require("./features/queries/auditLog/getRecentHttpRequestsByModule-auditLog.query.g");
const statsTodayHttpRequests_auditLog_query_g_1 = require("./features/queries/auditLog/statsTodayHttpRequests-auditLog.query.g");
const statsLastHourHttpRequests_auditLog_query_g_1 = require("./features/queries/auditLog/statsLastHourHttpRequests-auditLog.query.g");
const statsYesterdayHttpRequests_auditLog_query_g_1 = require("./features/queries/auditLog/statsYesterdayHttpRequests-auditLog.query.g");
const statsWeeklyHttpRequests_auditLog_query_g_1 = require("./features/queries/auditLog/statsWeeklyHttpRequests-auditLog.query.g");
const statsMonthlyHttpRequests_auditLog_query_g_1 = require("./features/queries/auditLog/statsMonthlyHttpRequests-auditLog.query.g");
const statsYearlyHttpRequests_auditLog_query_g_1 = require("./features/queries/auditLog/statsYearlyHttpRequests-auditLog.query.g");
const statsDailyHttpRequestsByDay_auditLog_query_g_1 = require("./features/queries/auditLog/statsDailyHttpRequestsByDay-auditLog.query.g");
const statsDailyHttpRequestsByDayByModule_auditLog_query_g_1 = require("./features/queries/auditLog/statsDailyHttpRequestsByDayByModule-auditLog.query.g");
const statsHourlyHttpRequestsByModule_auditLog_query_g_1 = require("./features/queries/auditLog/statsHourlyHttpRequestsByModule-auditLog.query.g");
const statsTotalHttpRequestsByModule_auditLog_query_g_1 = require("./features/queries/auditLog/statsTotalHttpRequestsByModule-auditLog.query.g");
const statsHttpStatusCodesLast24HoursByModule_auditLog_query_g_1 = require("./features/queries/auditLog/statsHttpStatusCodesLast24HoursByModule-auditLog.query.g");
const statsHttpStatusCodes_auditLog_query_g_1 = require("./features/queries/auditLog/statsHttpStatusCodes-auditLog.query.g");
const statsHttpStatusCodesByModule_auditLog_query_g_1 = require("./features/queries/auditLog/statsHttpStatusCodesByModule-auditLog.query.g");
const statsTopHttpServicesByModule_auditLog_query_g_1 = require("./features/queries/auditLog/statsTopHttpServicesByModule-auditLog.query.g");
const commissionModel_controller_g_1 = require("./controllers/commissionModel.controller.g");
const commissionRule_controller_g_1 = require("./controllers/commissionRule.controller.g");
const sellerCommissionAssignment_controller_g_1 = require("./controllers/sellerCommissionAssignment.controller.g");
const categoryCommissionOverride_controller_g_1 = require("./controllers/categoryCommissionOverride.controller.g");
const promotionalCampaign_controller_g_1 = require("./controllers/promotionalCampaign.controller.g");
const campaignApplicability_controller_g_1 = require("./controllers/campaignApplicability.controller.g");
const auditLog_controller_g_1 = require("./controllers/auditLog.controller.g");
let PricingEngineModuleModule = class PricingEngineModuleModule {
};
exports.PricingEngineModuleModule = PricingEngineModuleModule;
exports.PricingEngineModuleModule = PricingEngineModuleModule = __decorate([
    (0, common_1.Module)({
        imports: [cqrs_1.CqrsModule, typeorm_1.TypeOrmModule.forFeature([commissionModel_entity_g_1.CommissionModel, commissionRule_entity_g_1.CommissionRule, sellerCommissionAssignment_entity_g_1.SellerCommissionAssignment, categoryCommissionOverride_entity_g_1.CategoryCommissionOverride, promotionalCampaign_entity_g_1.PromotionalCampaign, campaignApplicability_entity_g_1.CampaignApplicability, auditLog_entity_g_1.AuditLog])],
        controllers: [commissionModel_controller_g_1.CommissionModelsController, commissionRule_controller_g_1.CommissionRulesController, sellerCommissionAssignment_controller_g_1.SellerCommissionAssignmentsController, categoryCommissionOverride_controller_g_1.CategoryCommissionOverridesController, promotionalCampaign_controller_g_1.PromotionalCampaignsController, campaignApplicability_controller_g_1.CampaignApplicabilitiesController, auditLog_controller_g_1.AuditLogsController],
        providers: [
            commissionModel_repository_g_1.CommissionModelRepository,
            list_commissionModel_query_g_1.ListCommissionModelHandler,
            get_item_commissionModel_query_g_1.GetItemCommissionModelHandler,
            total_item_count_commissionModel_query_g_1.TotalItemCountCommissionModelHandler,
            insert_commissionModel_command_g_1.InsertCommissionModelHandler,
            update_commissionModel_command_g_1.UpdateCommissionModelHandler,
            delete_item_commissionModel_command_g_1.DeleteItemCommissionModelHandler,
            getActive_commissionModel_query_g_1.GetActiveCommissionModelHandler,
            getByName_commissionModel_query_g_1.GetByNameCommissionModelHandler,
            deactivate_commissionModel_command_g_1.DeactivateCommissionModelHandler,
            commissionRule_repository_g_1.CommissionRuleRepository,
            list_commissionRule_query_g_1.ListCommissionRuleHandler,
            get_item_commissionRule_query_g_1.GetItemCommissionRuleHandler,
            total_item_count_commissionRule_query_g_1.TotalItemCountCommissionRuleHandler,
            insert_commissionRule_command_g_1.InsertCommissionRuleHandler,
            update_commissionRule_command_g_1.UpdateCommissionRuleHandler,
            delete_item_commissionRule_command_g_1.DeleteItemCommissionRuleHandler,
            getByModelId_commissionRule_query_g_1.GetByModelIdCommissionRuleHandler,
            getActiveRulesByModel_commissionRule_query_g_1.GetActiveRulesByModelCommissionRuleHandler,
            deactivate_commissionRule_command_g_1.DeactivateCommissionRuleHandler,
            sellerCommissionAssignment_repository_g_1.SellerCommissionAssignmentRepository,
            list_sellerCommissionAssignment_query_g_1.ListSellerCommissionAssignmentHandler,
            get_item_sellerCommissionAssignment_query_g_1.GetItemSellerCommissionAssignmentHandler,
            total_item_count_sellerCommissionAssignment_query_g_1.TotalItemCountSellerCommissionAssignmentHandler,
            insert_sellerCommissionAssignment_command_g_1.InsertSellerCommissionAssignmentHandler,
            update_sellerCommissionAssignment_command_g_1.UpdateSellerCommissionAssignmentHandler,
            delete_item_sellerCommissionAssignment_command_g_1.DeleteItemSellerCommissionAssignmentHandler,
            getBySellerId_sellerCommissionAssignment_query_g_1.GetBySellerIdSellerCommissionAssignmentHandler,
            getByModelId_sellerCommissionAssignment_query_g_1.GetByModelIdSellerCommissionAssignmentHandler,
            removeAssignment_sellerCommissionAssignment_command_g_1.RemoveAssignmentSellerCommissionAssignmentHandler,
            categoryCommissionOverride_repository_g_1.CategoryCommissionOverrideRepository,
            list_categoryCommissionOverride_query_g_1.ListCategoryCommissionOverrideHandler,
            get_item_categoryCommissionOverride_query_g_1.GetItemCategoryCommissionOverrideHandler,
            total_item_count_categoryCommissionOverride_query_g_1.TotalItemCountCategoryCommissionOverrideHandler,
            insert_categoryCommissionOverride_command_g_1.InsertCategoryCommissionOverrideHandler,
            update_categoryCommissionOverride_command_g_1.UpdateCategoryCommissionOverrideHandler,
            delete_item_categoryCommissionOverride_command_g_1.DeleteItemCategoryCommissionOverrideHandler,
            getByCategoryId_categoryCommissionOverride_query_g_1.GetByCategoryIdCategoryCommissionOverrideHandler,
            removeOverride_categoryCommissionOverride_command_g_1.RemoveOverrideCategoryCommissionOverrideHandler,
            promotionalCampaign_repository_g_1.PromotionalCampaignRepository,
            list_promotionalCampaign_query_g_1.ListPromotionalCampaignHandler,
            get_item_promotionalCampaign_query_g_1.GetItemPromotionalCampaignHandler,
            total_item_count_promotionalCampaign_query_g_1.TotalItemCountPromotionalCampaignHandler,
            insert_promotionalCampaign_command_g_1.InsertPromotionalCampaignHandler,
            update_promotionalCampaign_command_g_1.UpdatePromotionalCampaignHandler,
            delete_item_promotionalCampaign_command_g_1.DeleteItemPromotionalCampaignHandler,
            getActiveCampaigns_promotionalCampaign_query_g_1.GetActiveCampaignsPromotionalCampaignHandler,
            getCampaignsInDateRange_promotionalCampaign_query_g_1.GetCampaignsInDateRangePromotionalCampaignHandler,
            deactivate_promotionalCampaign_command_g_1.DeactivatePromotionalCampaignHandler,
            campaignApplicability_repository_g_1.CampaignApplicabilityRepository,
            list_campaignApplicability_query_g_1.ListCampaignApplicabilityHandler,
            get_item_campaignApplicability_query_g_1.GetItemCampaignApplicabilityHandler,
            total_item_count_campaignApplicability_query_g_1.TotalItemCountCampaignApplicabilityHandler,
            insert_campaignApplicability_command_g_1.InsertCampaignApplicabilityHandler,
            update_campaignApplicability_command_g_1.UpdateCampaignApplicabilityHandler,
            delete_item_campaignApplicability_command_g_1.DeleteItemCampaignApplicabilityHandler,
            getByCampaignId_campaignApplicability_query_g_1.GetByCampaignIdCampaignApplicabilityHandler,
            removeApplicability_campaignApplicability_command_g_1.RemoveApplicabilityCampaignApplicabilityHandler,
            auditLog_repository_g_1.AuditLogRepository,
            list_auditLog_query_g_1.ListAuditLogHandler,
            get_item_auditLog_query_g_1.GetItemAuditLogHandler,
            total_item_count_auditLog_query_g_1.TotalItemCountAuditLogHandler,
            insert_auditLog_command_g_1.InsertAuditLogHandler,
            update_auditLog_command_g_1.UpdateAuditLogHandler,
            delete_item_auditLog_command_g_1.DeleteItemAuditLogHandler,
            getRecentHttpRequests_auditLog_query_g_1.GetRecentHttpRequestsAuditLogHandler,
            getRecentHttpRequestsByModule_auditLog_query_g_1.GetRecentHttpRequestsByModuleAuditLogHandler,
            statsTodayHttpRequests_auditLog_query_g_1.StatsTodayHttpRequestsAuditLogHandler,
            statsLastHourHttpRequests_auditLog_query_g_1.StatsLastHourHttpRequestsAuditLogHandler,
            statsYesterdayHttpRequests_auditLog_query_g_1.StatsYesterdayHttpRequestsAuditLogHandler,
            statsWeeklyHttpRequests_auditLog_query_g_1.StatsWeeklyHttpRequestsAuditLogHandler,
            statsMonthlyHttpRequests_auditLog_query_g_1.StatsMonthlyHttpRequestsAuditLogHandler,
            statsYearlyHttpRequests_auditLog_query_g_1.StatsYearlyHttpRequestsAuditLogHandler,
            statsDailyHttpRequestsByDay_auditLog_query_g_1.StatsDailyHttpRequestsByDayAuditLogHandler,
            statsDailyHttpRequestsByDayByModule_auditLog_query_g_1.StatsDailyHttpRequestsByDayByModuleAuditLogHandler,
            statsHourlyHttpRequestsByModule_auditLog_query_g_1.StatsHourlyHttpRequestsByModuleAuditLogHandler,
            statsTotalHttpRequestsByModule_auditLog_query_g_1.StatsTotalHttpRequestsByModuleAuditLogHandler,
            statsHttpStatusCodesLast24HoursByModule_auditLog_query_g_1.StatsHttpStatusCodesLast24HoursByModuleAuditLogHandler,
            statsHttpStatusCodes_auditLog_query_g_1.StatsHttpStatusCodesAuditLogHandler,
            statsHttpStatusCodesByModule_auditLog_query_g_1.StatsHttpStatusCodesByModuleAuditLogHandler,
            statsTopHttpServicesByModule_auditLog_query_g_1.StatsTopHttpServicesByModuleAuditLogHandler,
        ],
        exports: [],
    })
], PricingEngineModuleModule);
//# sourceMappingURL=pricingEngineModule.module.g.js.map