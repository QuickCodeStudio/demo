"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuditLog = createAuditLog;
const crypto_1 = require("crypto");
function createAuditLog(partial) {
    return {
        id: partial.id ?? (0, crypto_1.randomUUID)(),
        entityName: partial.entityName,
        entityId: partial.entityId,
        action: partial.action,
        userId: partial.userId ?? null,
        userName: partial.userName ?? null,
        userGroup: partial.userGroup ?? null,
        timestamp: partial.timestamp,
        durationMs: partial.durationMs ?? null,
        statusCode: partial.statusCode ?? null,
        requestModule: partial.requestModule ?? null,
        requestPath: partial.requestPath ?? null,
        oldValues: partial.oldValues ?? null,
        newValues: partial.newValues ?? null,
        changedColumns: partial.changedColumns ?? null,
        isChanged: partial.isChanged ?? false,
        changeSummary: partial.changeSummary ?? null,
        ipAddress: partial.ipAddress ?? null,
        userAgent: partial.userAgent ?? null,
        correlationId: partial.correlationId ?? null,
        isSuccess: partial.isSuccess ?? true,
        errorMessage: partial.errorMessage ?? null,
        hash: partial.hash ?? null,
    };
}
//# sourceMappingURL=audit-log.js.map