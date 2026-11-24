"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateAuditLogDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const auditLog_dto_g_1 = require("./auditLog.dto.g");
class UpdateAuditLogDto extends (0, swagger_1.PartialType)((0, swagger_1.OmitType)(auditLog_dto_g_1.AuditLogDto, ['id'])) {
}
exports.UpdateAuditLogDto = UpdateAuditLogDto;
//# sourceMappingURL=update-auditLog.dto.g.js.map