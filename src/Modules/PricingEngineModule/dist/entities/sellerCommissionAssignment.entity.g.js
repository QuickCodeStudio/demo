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
exports.SellerCommissionAssignment = void 0;
const typeorm_1 = require("typeorm");
let SellerCommissionAssignment = class SellerCommissionAssignment {
};
exports.SellerCommissionAssignment = SellerCommissionAssignment;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ name: 'SELLER_ID', type: 'int' }),
    __metadata("design:type", Number)
], SellerCommissionAssignment.prototype, "sellerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'COMMISSION_MODEL_ID', type: 'int' }),
    __metadata("design:type", Number)
], SellerCommissionAssignment.prototype, "commissionModelId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'EFFECTIVE_DATE', type: 'datetime' }),
    __metadata("design:type", Date)
], SellerCommissionAssignment.prototype, "effectiveDate", void 0);
exports.SellerCommissionAssignment = SellerCommissionAssignment = __decorate([
    (0, typeorm_1.Entity)({ name: 'SELLER_COMMISSION_ASSIGNMENTS' })
], SellerCommissionAssignment);
//# sourceMappingURL=sellerCommissionAssignment.entity.g.js.map