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
exports.CommissionRule = void 0;
const typeorm_1 = require("typeorm");
const ruleScope_enum_g_1 = require("../enums/ruleScope.enum.g");
const commissionType_enum_g_1 = require("../enums/commissionType.enum.g");
let CommissionRule = class CommissionRule {
};
exports.CommissionRule = CommissionRule;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'ID' }),
    __metadata("design:type", Number)
], CommissionRule.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'COMMISSION_MODEL_ID', type: 'int' }),
    __metadata("design:type", Number)
], CommissionRule.prototype, "commissionModelId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'SCOPE', type: 'varchar' }),
    __metadata("design:type", String)
], CommissionRule.prototype, "scope", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'SCOPE_ID', type: 'int' }),
    __metadata("design:type", Number)
], CommissionRule.prototype, "scopeId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'COMMISSION_TYPE', type: 'varchar' }),
    __metadata("design:type", String)
], CommissionRule.prototype, "commissionType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'PERCENTAGE_RATE', type: 'decimal' }),
    __metadata("design:type", Number)
], CommissionRule.prototype, "percentageRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'FIXED_AMOUNT', type: 'decimal' }),
    __metadata("design:type", Number)
], CommissionRule.prototype, "fixedAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'IS_ACTIVE', type: 'bit' }),
    __metadata("design:type", Boolean)
], CommissionRule.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'IsDeleted', type: 'bit', default: false }),
    __metadata("design:type", Boolean)
], CommissionRule.prototype, "isDeleted", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'DeletedOnUtc', type: 'datetime2', nullable: true }),
    __metadata("design:type", Object)
], CommissionRule.prototype, "deletedOnUtc", void 0);
exports.CommissionRule = CommissionRule = __decorate([
    (0, typeorm_1.Entity)({ name: 'COMMISSION_RULES' })
], CommissionRule);
//# sourceMappingURL=commissionRule.entity.g.js.map