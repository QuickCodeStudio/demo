package com.quickcode.module.auditing;

import static org.junit.jupiter.api.Assertions.assertTrue;

import com.quickcode.module.db.DbConfig.QuickCodeDbType;
import org.junit.jupiter.api.Test;

class AuditSqlTest {

    @Test
    void insertAuditSqlIsDialectSpecific() {
        assertTrue(AuditSql.insertAuditSql(QuickCodeDbType.MSSQL).contains("AUDIT_LOGS"));
        assertTrue(AuditSql.insertAuditSql(QuickCodeDbType.MSSQL).contains("[dbo].[AUDIT_LOGS]"));
        assertTrue(AuditSql.insertAuditSql(QuickCodeDbType.MSSQL).contains("[CLIENT_ID]"));
        assertTrue(AuditSql.insertAuditSql(QuickCodeDbType.MYSQL).contains("`AUDIT_LOGS`"));
        assertTrue(AuditSql.insertAuditSql(QuickCodeDbType.MYSQL).contains("`CLIENT_ID`"));
        assertTrue(AuditSql.insertAuditSql(QuickCodeDbType.POSTGRESQL).contains("\"AUDIT_LOGS\""));
        assertTrue(AuditSql.insertAuditSql(QuickCodeDbType.POSTGRESQL).contains("\"CLIENT_ID\""));
    }
}
