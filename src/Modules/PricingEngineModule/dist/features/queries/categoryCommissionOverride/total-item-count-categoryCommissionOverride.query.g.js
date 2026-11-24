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
exports.TotalItemCountCategoryCommissionOverrideHandler = exports.TotalItemCountCategoryCommissionOverrideQuery = void 0;
const cqrs_1 = require("@nestjs/cqrs");
const categoryCommissionOverride_repository_g_1 = require("../../../repositories/categoryCommissionOverride.repository.g");
const common_1 = require("@demo/common");
class TotalItemCountCategoryCommissionOverrideQuery {
}
exports.TotalItemCountCategoryCommissionOverrideQuery = TotalItemCountCategoryCommissionOverrideQuery;
let TotalItemCountCategoryCommissionOverrideHandler = class TotalItemCountCategoryCommissionOverrideHandler {
    constructor(repository) {
        this.repository = repository;
    }
    async execute(_query) {
        return common_1.Response.fromRepo(await this.repository.countAsync());
    }
};
exports.TotalItemCountCategoryCommissionOverrideHandler = TotalItemCountCategoryCommissionOverrideHandler;
exports.TotalItemCountCategoryCommissionOverrideHandler = TotalItemCountCategoryCommissionOverrideHandler = __decorate([
    (0, cqrs_1.QueryHandler)(TotalItemCountCategoryCommissionOverrideQuery),
    __metadata("design:paramtypes", [categoryCommissionOverride_repository_g_1.CategoryCommissionOverrideRepository])
], TotalItemCountCategoryCommissionOverrideHandler);
//# sourceMappingURL=total-item-count-categoryCommissionOverride.query.g.js.map