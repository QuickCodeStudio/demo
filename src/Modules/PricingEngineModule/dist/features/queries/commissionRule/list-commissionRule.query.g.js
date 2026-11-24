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
exports.ListCommissionRuleHandler = exports.ListCommissionRuleQuery = void 0;
const cqrs_1 = require("@nestjs/cqrs");
const commissionRule_repository_g_1 = require("../../../repositories/commissionRule.repository.g");
const common_1 = require("@demo/common");
class ListCommissionRuleQuery {
    constructor(page, size, includeCount = false) {
        this.page = page;
        this.size = size;
        this.includeCount = includeCount;
    }
}
exports.ListCommissionRuleQuery = ListCommissionRuleQuery;
let ListCommissionRuleHandler = class ListCommissionRuleHandler {
    constructor(repository) {
        this.repository = repository;
    }
    async execute(query) {
        const listTask = this.repository.listAsync(query.page, query.size);
        if (!query.includeCount) {
            const res = await listTask;
            return common_1.Response.fromRepo(res, items => ({ items, totalCount: undefined }));
        }
        const [listRes, countRes] = await Promise.all([listTask, this.repository.countAsync()]);
        return common_1.Response.fromRepo(listRes, items => ({ items, totalCount: countRes.code === 0 ? countRes.value : undefined }));
    }
};
exports.ListCommissionRuleHandler = ListCommissionRuleHandler;
exports.ListCommissionRuleHandler = ListCommissionRuleHandler = __decorate([
    (0, cqrs_1.QueryHandler)(ListCommissionRuleQuery),
    __metadata("design:paramtypes", [commissionRule_repository_g_1.CommissionRuleRepository])
], ListCommissionRuleHandler);
//# sourceMappingURL=list-commissionRule.query.g.js.map