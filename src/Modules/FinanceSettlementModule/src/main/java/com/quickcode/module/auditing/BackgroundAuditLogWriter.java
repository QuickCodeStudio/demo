package com.quickcode.module.auditing;

import com.quickcode.module.db.DbConfig.QuickCodeDbType;
import com.quickcode.module.db.SqlLoader;
import com.quickcode.module.db.SqlLoader.BoundSql;
import jakarta.annotation.PreDestroy;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@Primary
public class BackgroundAuditLogWriter implements AuditLogWriter {

    private static final Logger log = LoggerFactory.getLogger(BackgroundAuditLogWriter.class);
    private static final int BATCH_SIZE = 100;
    private static final int MAX_QUEUE_SIZE = 10_000;

    private final JdbcTemplate jdbcTemplate;
    private final SqlLoader sqlLoader;
    private final QuickCodeDbType dbType;
    private final ConcurrentLinkedQueue<AuditLogPayload> queue = new ConcurrentLinkedQueue<>();
    private final ScheduledExecutorService scheduler;
    private volatile boolean running;
    private final boolean enabled;
    private volatile boolean clientIdColumnReady;

    public BackgroundAuditLogWriter(
            JdbcTemplate jdbcTemplate, SqlLoader sqlLoader, QuickCodeDbType dbType) {
        this.jdbcTemplate = jdbcTemplate;
        this.sqlLoader = sqlLoader;
        this.dbType = dbType;
        this.enabled = isAuditEnabled();
        this.scheduler =
                Executors.newSingleThreadScheduledExecutor(
                        r -> {
                            Thread t = new Thread(r, "audit-log-writer");
                            t.setDaemon(true);
                            return t;
                        });
        if (enabled) {
            running = true;
            scheduler.scheduleWithFixedDelay(this::drainSafely, 0, 500, TimeUnit.MILLISECONDS);
            log.info("Audit Log Background Service started");
        }
    }

    private static boolean isAuditEnabled() {
        if ("1".equals(System.getenv("SWAGGER_DUMP"))) {
            return false;
        }
        String raw = System.getenv("DB_TYPE");
        if (raw == null || raw.isBlank()) {
            return false;
        }
        return !QuickCodeDbType.normalize(raw).equals(QuickCodeDbType.INMEMORY);
    }

    @Override
    public void queueAuditLog(AuditLogPayload auditLog) {
        if (!enabled) {
            return;
        }
        if (queue.size() >= MAX_QUEUE_SIZE) {
            log.warn(
                    "Audit queue is full. Dropping audit log for {}:{}",
                    auditLog.entityName,
                    auditLog.entityId);
            return;
        }
        auditLog.hash = AuditHash.compute(auditLog);
        queue.offer(auditLog);
    }

    @PreDestroy
    public void shutdown() {
        running = false;
        scheduler.shutdown();
        try {
            if (!scheduler.awaitTermination(30, TimeUnit.SECONDS)) {
                scheduler.shutdownNow();
            }
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            scheduler.shutdownNow();
        }
        flushRemaining();
        log.info("Audit Log Background Service stopped");
    }

    private void drainSafely() {
        if (!running && queue.isEmpty()) {
            return;
        }
        try {
            List<AuditLogPayload> batch = new ArrayList<>(BATCH_SIZE);
            while (batch.size() < BATCH_SIZE) {
                AuditLogPayload item = queue.poll();
                if (item == null) {
                    break;
                }
                batch.add(item);
            }
            if (!batch.isEmpty()) {
                writeBatch(batch);
            }
        } catch (Exception ex) {
            log.error("Error processing audit logs", ex);
        }
    }

    private void flushRemaining() {
        if (queue.isEmpty()) {
            return;
        }
        List<AuditLogPayload> remaining = new ArrayList<>();
        AuditLogPayload item;
        while ((item = queue.poll()) != null) {
            remaining.add(item);
        }
        if (!remaining.isEmpty()) {
            log.info("Flushing {} remaining audit logs", remaining.size());
            writeBatch(remaining);
        }
    }

    private void writeBatch(List<AuditLogPayload> batch) {
        ensureClientIdColumn();
        String sql = AuditSql.insertAuditSql(dbType);
        for (AuditLogPayload logItem : batch) {
            coalesceNullableStringsForInsert(logItem);
            BoundSql bound = sqlLoader.bindNamedParams(sql, toNamedParams(logItem), dbType);
            jdbcTemplate.update(bound.text(), bound.params().toArray());
        }
        log.debug("Successfully wrote {} audit logs to database", batch.size());
    }

    private void ensureClientIdColumn() {
        if (clientIdColumnReady) {
            return;
        }
        try {
            jdbcTemplate.execute(AuditSql.ensureClientIdColumnSql(dbType));
            clientIdColumnReady = true;
        } catch (Exception ex) {
            log.warn("Could not ensure AUDIT_LOGS.CLIENT_ID column; continuing without alter.", ex);
        }
    }

    private static void coalesceNullableStringsForInsert(AuditLogPayload logItem) {
        if (logItem.userId == null) logItem.userId = "";
        if (logItem.userName == null) logItem.userName = "";
        if (logItem.userGroup == null) logItem.userGroup = "";
        if (logItem.oldValues == null) logItem.oldValues = "";
        if (logItem.newValues == null) logItem.newValues = "";
        if (logItem.changedColumns == null) logItem.changedColumns = "";
        if (logItem.changeSummary == null) logItem.changeSummary = "";
        if (logItem.ipAddress == null) logItem.ipAddress = "";
        if (logItem.userAgent == null) logItem.userAgent = "";
        if (logItem.clientId == null) logItem.clientId = "";
        if (logItem.correlationId == null) logItem.correlationId = "";
        if (logItem.requestModule == null) logItem.requestModule = "";
        if (logItem.requestPath == null) logItem.requestPath = "";
        if (logItem.errorMessage == null) logItem.errorMessage = "";
        if (logItem.hash == null) logItem.hash = "";
    }

    private static Map<String, Object> toNamedParams(AuditLogPayload logItem) {
        Map<String, Object> named = new HashMap<>();
        named.put("Id", logItem.id);
        named.put("EntityName", logItem.entityName);
        named.put("EntityId", logItem.entityId);
        named.put("Action", logItem.action);
        named.put("UserId", logItem.userId);
        named.put("UserName", logItem.userName);
        named.put("UserGroup", logItem.userGroup);
        named.put("Timestamp", Timestamp.from(logItem.timestamp));
        named.put("DurationMs", logItem.durationMs);
        named.put("StatusCode", logItem.statusCode);
        named.put("RequestModule", logItem.requestModule);
        named.put("RequestPath", logItem.requestPath);
        named.put("OldValues", logItem.oldValues);
        named.put("NewValues", logItem.newValues);
        named.put("ChangedColumns", logItem.changedColumns);
        named.put("IsChanged", logItem.isChanged);
        named.put("ChangeSummary", logItem.changeSummary);
        named.put("IpAddress", logItem.ipAddress);
        named.put("UserAgent", logItem.userAgent);
        named.put("ClientId", logItem.clientId);
        named.put("CorrelationId", logItem.correlationId);
        named.put("IsSuccess", logItem.isSuccess);
        named.put("ErrorMessage", logItem.errorMessage);
        named.put("Hash", logItem.hash);
        return named;
    }
}
