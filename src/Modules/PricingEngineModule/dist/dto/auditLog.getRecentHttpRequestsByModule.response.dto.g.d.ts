export declare class AuditLogGetRecentHttpRequestsByModuleResponseDto {
    id: string;
    timestamp: Date;
    durationMs?: number;
    statusCode?: number;
    requestModule?: string;
    action: string;
    userGroup?: string;
    isSuccess?: boolean;
    errorMessage?: string;
    newValues?: string;
}
