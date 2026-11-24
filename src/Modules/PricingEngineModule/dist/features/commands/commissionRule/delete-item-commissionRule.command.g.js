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
exports.DeleteItemCommissionRuleHandler = exports.DeleteItemCommissionRuleCommand = void 0;
const cqrs_1 = require("@nestjs/cqrs");
const commissionRule_repository_g_1 = require("../../../repositories/commissionRule.repository.g");
const common_1 = require("@demo/common");
class DeleteItemCommissionRuleCommand {
    constructor(id) {
        this.id = id;
    }
}
exports.DeleteItemCommissionRuleCommand = DeleteItemCommissionRuleCommand;
let DeleteItemCommissionRuleHandler = class DeleteItemCommissionRuleHandler {
    constructor(repository) {
        this.repository = repository;
    }
    async execute(command) {
        return common_1.Response.fromRepo(await this.repository.deleteAsync(command.id));
    }
};
exports.DeleteItemCommissionRuleHandler = DeleteItemCommissionRuleHandler;
exports.DeleteItemCommissionRuleHandler = DeleteItemCommissionRuleHandler = __decorate([
    (0, cqrs_1.CommandHandler)(DeleteItemCommissionRuleCommand),
    __metadata("design:paramtypes", [commissionRule_repository_g_1.CommissionRuleRepository])
], DeleteItemCommissionRuleHandler);
//# sourceMappingURL=delete-item-commissionRule.command.g.js.map