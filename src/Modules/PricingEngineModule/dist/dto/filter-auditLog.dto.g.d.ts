export declare class FilterAuditLogDto {
    entityName?: string | null;
    entityId?: string | null;
    action?: string | null;
    userId?: string | null;
    userName?: string | null;
    userGroup?: string | null;
    timestamp?: Date | null;
    durationMs?: number | null;
    statusCode?: number | null;
    requestModule?: string | null;
    requestPath?: string | null;
    oldValues?: string | null;
    newValues?: string | null;
    changedColumns?: string | null;
    isChanged?: boolean | null;
    changeSummary?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    clientId?: string | null;
    correlationId?: string | null;
    isSuccess?: boolean | null;
    errorMessage?: string | null;
    hash?: string | null;
    page?: number;
    size?: number;
}
