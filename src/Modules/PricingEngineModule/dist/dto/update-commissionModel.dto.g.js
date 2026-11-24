"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateCommissionModelDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const commissionModel_dto_g_1 = require("./commissionModel.dto.g");
class UpdateCommissionModelDto extends (0, swagger_1.PartialType)((0, swagger_1.OmitType)(commissionModel_dto_g_1.CommissionModelDto, ['id'])) {
}
exports.UpdateCommissionModelDto = UpdateCommissionModelDto;
//# sourceMappingURL=update-commissionModel.dto.g.js.map