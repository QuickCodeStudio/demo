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
exports.PromotionalCampaign = void 0;
const typeorm_1 = require("typeorm");
let PromotionalCampaign = class PromotionalCampaign {
};
exports.PromotionalCampaign = PromotionalCampaign;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'ID' }),
    __metadata("design:type", Number)
], PromotionalCampaign.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'NAME', type: 'varchar' }),
    __metadata("design:type", String)
], PromotionalCampaign.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'START_DATE', type: 'datetime' }),
    __metadata("design:type", Date)
], PromotionalCampaign.prototype, "startDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'END_DATE', type: 'datetime' }),
    __metadata("design:type", Date)
], PromotionalCampaign.prototype, "endDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'DISCOUNT_PERCENTAGE', type: 'decimal' }),
    __metadata("design:type", Number)
], PromotionalCampaign.prototype, "discountPercentage", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'IS_ACTIVE', type: 'bit' }),
    __metadata("design:type", Boolean)
], PromotionalCampaign.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'IsDeleted', type: 'bit', default: false }),
    __metadata("design:type", Boolean)
], PromotionalCampaign.prototype, "isDeleted", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'DeletedOnUtc', type: 'datetime2', nullable: true }),
    __metadata("design:type", Object)
], PromotionalCampaign.prototype, "deletedOnUtc", void 0);
exports.PromotionalCampaign = PromotionalCampaign = __decorate([
    (0, typeorm_1.Entity)({ name: 'PROMOTIONAL_CAMPAIGNS' })
], PromotionalCampaign);
//# sourceMappingURL=promotionalCampaign.entity.g.js.map