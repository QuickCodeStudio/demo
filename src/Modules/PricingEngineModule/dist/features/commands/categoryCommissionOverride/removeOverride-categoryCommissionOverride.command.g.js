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
exports.RemoveOverrideCategoryCommissionOverrideHandler = exports.RemoveOverrideCategoryCommissionOverrideCommand = void 0;
const cqrs_1 = require("@nestjs/cqrs");
const categoryCommissionOverride_repository_g_1 = require("../../../repositories/categoryCommissionOverride.repository.g");
const common_1 = require("@demo/common");
class RemoveOverrideCategoryCommissionOverrideCommand {
    constructor(categoryCommissionOverrideId) {
        this.categoryCommissionOverrideId = categoryCommissionOverrideId;
    }
}
exports.RemoveOverrideCategoryCommissionOverrideCommand = RemoveOverrideCategoryCommissionOverrideCommand;
let RemoveOverrideCategoryCommissionOverrideHandler = class RemoveOverrideCategoryCommissionOverrideHandler {
    constructor(repository) {
        this.repository = repository;
    }
    async execute(command) {
        return common_1.Response.fromRepo(await this.repository.removeOverrideAsync(command.categoryCommissionOverrideId));
    }
};
exports.RemoveOverrideCategoryCommissionOverrideHandler = RemoveOverrideCategoryCommissionOverrideHandler;
exports.RemoveOverrideCategoryCommissionOverrideHandler = RemoveOverrideCategoryCommissionOverrideHandler = __decorate([
    (0, cqrs_1.CommandHandler)(RemoveOverrideCategoryCommissionOverrideCommand),
    __metadata("design:paramtypes", [categoryCommissionOverride_repository_g_1.CategoryCommissionOverrideRepository])
], RemoveOverrideCategoryCommissionOverrideHandler);
//# sourceMappingURL=removeOverride-categoryCommissionOverride.command.g.js.map