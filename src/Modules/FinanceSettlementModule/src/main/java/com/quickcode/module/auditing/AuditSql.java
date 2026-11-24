package com.quickcode.module.auditing;

import com.quickcode.module.db.DbConfig.QuickCodeDbType;

public final class AuditSql {

    private AuditSql() {}

    public static String insertAuditSql(QuickCodeDbType databaseType) {
        return switch (databaseType) {
            case MSSQL ->
                    """
                    INSERT INTO [dbo].[AUDIT_LOGS] ([ID], [ENTITY_NAME], [ENTITY_ID], [ACTION], [USER_ID], [USER_NAME], [USER_GROUP], [TIMESTAMP], [DURATION_MS], [STATUS_CODE], [REQUEST_MODULE], [REQUEST_PATH], [OLD_VALUES], [NEW_VALUES], [CHANGED_COLUMNS], [IS_CHANGED], [CHANGE_SUMMARY], [IP_ADDRESS], [USER_AGENT], [CLIENT_ID], [CORRELATION_ID], [IS_SUCCESS], [ERROR_MESSAGE], [HASH])
                    VALUES (@Id, @EntityName, @EntityId, @Action, @UserId, @UserName, @UserGroup, @Timestamp, @DurationMs, @StatusCode, @RequestModule, @RequestPath, @OldValues, @NewValues, @ChangedColumns, @IsChanged, @ChangeSummary, @IpAddress, @UserAgent, @ClientId, @CorrelationId, @IsSuccess, @ErrorMessage, @Hash);""";
            case MYSQL ->
                    """
                    INSERT INTO `AUDIT_LOGS` (`ID`, `ENTITY_NAME`, `ENTITY_ID`, `ACTION`, `USER_ID`, `USER_NAME`, `USER_GROUP`, `TIMESTAMP`, `DURATION_MS`, `STATUS_CODE`, `REQUEST_MODULE`, `REQUEST_PATH`, `OLD_VALUES`, `NEW_VALUES`, `CHANGED_COLUMNS`, `IS_CHANGED`, `CHANGE_SUMMARY`, `IP_ADDRESS`, `USER_AGENT`, `CLIENT_ID`, `CORRELATION_ID`, `IS_SUCCESS`, `ERROR_MESSAGE`, `HASH`)
                    VALUES (@Id, @EntityName, @EntityId, @Action, @UserId, @UserName, @UserGroup, @Timestamp, @DurationMs, @StatusCode, @RequestModule, @RequestPath, @OldValues, @NewValues, @ChangedColumns, @IsChanged, @ChangeSummary, @IpAddress, @UserAgent, @ClientId, @CorrelationId, @IsSuccess, @ErrorMessage, @Hash);""";
            default ->
                    """
                    INSERT INTO "AUDIT_LOGS" ("ID", "ENTITY_NAME", "ENTITY_ID", "ACTION", "USER_ID", "USER_NAME", "USER_GROUP", "TIMESTAMP", "DURATION_MS", "STATUS_CODE", "REQUEST_MODULE", "REQUEST_PATH", "OLD_VALUES", "NEW_VALUES", "CHANGED_COLUMNS", "IS_CHANGED", "CHANGE_SUMMARY", "IP_ADDRESS", "USER_AGENT", "CLIENT_ID", "CORRELATION_ID", "IS_SUCCESS", "ERROR_MESSAGE", "HASH")
                    VALUES (@Id, @EntityName, @EntityId, @Action, @UserId, @UserName, @UserGroup, @Timestamp, @DurationMs, @StatusCode, @RequestModule, @RequestPath, @OldValues, @NewValues, @ChangedColumns, @IsChanged, @ChangeSummary, @IpAddress, @UserAgent, @ClientId, @CorrelationId, @IsSuccess, @ErrorMessage, @Hash);""";
        };
    }

    public static String ensureClientIdColumnSql(QuickCodeDbType databaseType) {
        return switch (databaseType) {
            case MSSQL ->
                    """
                    IF COL_LENGTH('dbo.AUDIT_LOGS', 'CLIENT_ID') IS NULL
                      ALTER TABLE [dbo].[AUDIT_LOGS] ADD [CLIENT_ID] nvarchar(100) NULL;""";
            case MYSQL ->
                    """
                    ALTER TABLE `AUDIT_LOGS` ADD COLUMN IF NOT EXISTS `CLIENT_ID` varchar(100) NULL;""";
            default ->
                    """
                    ALTER TABLE "AUDIT_LOGS" ADD COLUMN IF NOT EXISTS "CLIENT_ID" varchar(100) NULL;""";
        };
    }
}
