"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateCommissionRuleDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const commissionRule_dto_g_1 = require("./commissionRule.dto.g");
class UpdateCommissionRuleDto extends (0, swagger_1.PartialType)((0, swagger_1.OmitType)(commissionRule_dto_g_1.CommissionRuleDto, ['id'])) {
}
exports.UpdateCommissionRuleDto = UpdateCommissionRuleDto;
//# sourceMappingURL=update-commissionRule.dto.g.js.map