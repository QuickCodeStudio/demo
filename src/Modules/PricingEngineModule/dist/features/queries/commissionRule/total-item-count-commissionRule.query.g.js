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
exports.TotalItemCountCommissionRuleHandler = exports.TotalItemCountCommissionRuleQuery = void 0;
const cqrs_1 = require("@nestjs/cqrs");
const commissionRule_repository_g_1 = require("../../../repositories/commissionRule.repository.g");
const common_1 = require("@demo/common");
class TotalItemCountCommissionRuleQuery {
}
exports.TotalItemCountCommissionRuleQuery = TotalItemCountCommissionRuleQuery;
let TotalItemCountCommissionRuleHandler = class TotalItemCountCommissionRuleHandler {
    constructor(repository) {
        this.repository = repository;
    }
    async execute(_query) {
        return common_1.Response.fromRepo(await this.repository.countAsync());
    }
};
exports.TotalItemCountCommissionRuleHandler = TotalItemCountCommissionRuleHandler;
exports.TotalItemCountCommissionRuleHandler = TotalItemCountCommissionRuleHandler = __decorate([
    (0, cqrs_1.QueryHandler)(TotalItemCountCommissionRuleQuery),
    __metadata("design:paramtypes", [commissionRule_repository_g_1.CommissionRuleRepository])
], TotalItemCountCommissionRuleHandler);
//# sourceMappingURL=total-item-count-commissionRule.query.g.js.map