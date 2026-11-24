export declare class AuditLogGetRecentHttpRequestsResponseDto {
    id: string;
    timestamp: Date;
    durationMs?: number;
    statusCode?: number;
    requestModule?: string;
    requestPath?: string;
    action: string;
    userGroup?: string;
    isSuccess?: boolean;
    errorMessage?: string;
    newValues?: string;
}
