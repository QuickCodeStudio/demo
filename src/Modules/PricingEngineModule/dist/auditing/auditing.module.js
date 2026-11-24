"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditingModule = void 0;
const common_1 = require("@nestjs/common");
const audit_log_writer_interface_1 = require("./audit-log-writer.interface");
const background_audit_log_writer_1 = require("./background-audit-log-writer");
const security_audit_middleware_1 = require("./security-audit.middleware");
let AuditingModule = class AuditingModule {
};
exports.AuditingModule = AuditingModule;
exports.AuditingModule = AuditingModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [
            background_audit_log_writer_1.BackgroundAuditLogWriter,
            { provide: audit_log_writer_interface_1.AUDIT_LOG_WRITER, useExisting: background_audit_log_writer_1.BackgroundAuditLogWriter },
            security_audit_middleware_1.SecurityAuditMiddleware,
        ],
        exports: [audit_log_writer_interface_1.AUDIT_LOG_WRITER, background_audit_log_writer_1.BackgroundAuditLogWriter, security_audit_middleware_1.SecurityAuditMiddleware],
    })
], AuditingModule);
//# sourceMappingURL=auditing.module.js.map