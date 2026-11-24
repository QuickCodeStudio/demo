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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetCampaignsInDateRangePromotionalCampaignHandler = exports.GetCampaignsInDateRangePromotionalCampaignQuery = void 0;
const cqrs_1 = require("@nestjs/cqrs");
const promotionalCampaign_repository_g_1 = require("../../../repositories/promotionalCampaign.repository.g");
const common_1 = require("@demo/common");
class GetCampaignsInDateRangePromotionalCampaignQuery {
    constructor(startDate_From, startDate_To, pageNumber, pageSize) {
        this.startDate_From = startDate_From;
        this.startDate_To = startDate_To;
        this.pageNumber = pageNumber;
        this.pageSize = pageSize;
    }
}
exports.GetCampaignsInDateRangePromotionalCampaignQuery = GetCampaignsInDateRangePromotionalCampaignQuery;
let GetCampaignsInDateRangePromotionalCampaignHandler = class GetCampaignsInDateRangePromotionalCampaignHandler {
    constructor(repository) {
        this.repository = repository;
    }
    async execute(query) {
        return common_1.Response.fromRepo(await this.repository.getCampaignsInDateRangeAsync(query.startDate_From, query.startDate_To, query.pageNumber, query.pageSize));
    }
};
exports.GetCampaignsInDateRangePromotionalCampaignHandler = GetCampaignsInDateRangePromotionalCampaignHandler;
exports.GetCampaignsInDateRangePromotionalCampaignHandler = GetCampaignsInDateRangePromotionalCampaignHandler = __decorate([
    (0, cqrs_1.QueryHandler)(GetCampaignsInDateRangePromotionalCampaignQuery),
    __metadata("design:paramtypes", [promotionalCampaign_repository_g_1.PromotionalCampaignRepository])
], GetCampaignsInDateRangePromotionalCampaignHandler);
//# sourceMappingURL=getCampaignsInDateRange-promotionalCampaign.query.g.js.map