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
exports.CommissionModel = void 0;
const typeorm_1 = require("typeorm");
let CommissionModel = class CommissionModel {
};
exports.CommissionModel = CommissionModel;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'ID' }),
    __metadata("design:type", Number)
], CommissionModel.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'NAME', type: 'varchar' }),
    __metadata("design:type", String)
], CommissionModel.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'IS_ACTIVE', type: 'bit' }),
    __metadata("design:type", Boolean)
], CommissionModel.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'DESCRIPTION', type: 'text' }),
    __metadata("design:type", String)
], CommissionModel.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'IsDeleted', type: 'bit', default: false }),
    __metadata("design:type", Boolean)
], CommissionModel.prototype, "isDeleted", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'DeletedOnUtc', type: 'datetime2', nullable: true }),
    __metadata("design:type", Object)
], CommissionModel.prototype, "deletedOnUtc", void 0);
exports.CommissionModel = CommissionModel = __decorate([
    (0, typeorm_1.Entity)({ name: 'COMMISSION_MODELS' })
], CommissionModel);
//# sourceMappingURL=commissionModel.entity.g.js.map