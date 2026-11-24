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
exports.UpdateCommissionModelHandler = exports.UpdateCommissionModelCommand = void 0;
const cqrs_1 = require("@nestjs/cqrs");
const commissionModel_repository_g_1 = require("../../../repositories/commissionModel.repository.g");
const common_1 = require("@demo/common");
class UpdateCommissionModelCommand {
    constructor(id, dto) {
        this.id = id;
        this.dto = dto;
    }
}
exports.UpdateCommissionModelCommand = UpdateCommissionModelCommand;
let UpdateCommissionModelHandler = class UpdateCommissionModelHandler {
    constructor(repository) {
        this.repository = repository;
    }
    async execute(command) {
        const existing = await this.repository.getByPkAsync(command.id);
        if (existing.code === 404)
            return common_1.Response.notFound();
        return common_1.Response.fromRepo(await this.repository.updateAsync(command.id, command.dto));
    }
};
exports.UpdateCommissionModelHandler = UpdateCommissionModelHandler;
exports.UpdateCommissionModelHandler = UpdateCommissionModelHandler = __decorate([
    (0, cqrs_1.CommandHandler)(UpdateCommissionModelCommand),
    __metadata("design:paramtypes", [commissionModel_repository_g_1.CommissionModelRepository])
], UpdateCommissionModelHandler);
//# sourceMappingURL=update-commissionModel.command.g.js.map