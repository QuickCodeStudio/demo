package com.quickcode.module.db;

import com.fasterxml.jackson.core.JsonProcessingException;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** Nest/C# parity — InitialData JSON under migrations with content-hash skip. */
@Component
@Order(20)
public class SeedRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SeedRunner.class);
    private static final String HISTORY_TABLE = "__QuickCodeSeedHistory";

    private final JdbcTemplate jdbc;
    private final SqlScriptExecutor executor;
    private final DbConfig.QuickCodeDbType dbType;

    public SeedRunner(JdbcTemplate jdbc, SqlScriptExecutor executor, DbConfig.QuickCodeDbType dbType) {
        this.jdbc = jdbc;
        this.executor = executor;
        this.dbType = dbType;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        if (!DbConfig.shouldRunMigration()) {
            log.info("RUN_MIGRATION disabled — skipping seed data.");
            return;
        }
        if (dbType == DbConfig.QuickCodeDbType.INMEMORY) {
            return;
        }

        DbConfig.ensureDatabaseExists(dbType);

        Path seedDir = resolveInitialDataDir();
        List<Path> files = listSeedFiles(seedDir);
        if (files.isEmpty()) {
            log.info("No QuickCode seed data files found in {}", seedDir);
            return;
        }

        executor.executeRawBatch(createSeedHistoryTableSql(dbType));

        for (Path file : files) {
            long started = System.currentTimeMillis();
            String content = SqlLoader.stripBom(Files.readString(file, StandardCharsets.UTF_8));
            String fileName = file.getFileName().toString();
            String hash = SeedSupport.contentHash(content);

            if (seedAlreadyApplied(fileName, hash)) {
                log.info("Skipped QuickCode seed file {}; already applied.", fileName);
                continue;
            }

            int insertedRows;
            try {
                insertedRows = applySeedFile(content);
            } catch (Exception ex) {
                log.error("Seed file failed: {}", fileName, ex);
                continue;
            }

            long elapsedMs = System.currentTimeMillis() - started;
            jdbc.update(
                    insertHistorySql(dbType),
                    fileName,
                    hash,
                    Timestamp.from(Instant.now()),
                    insertedRows,
                    elapsedMs);
            log.info("Applied QuickCode seed file {} ({} rows).", fileName, insertedRows);
        }
    }

    static Path resolveInitialDataDir() {
        String fromEnv = System.getenv("QUICKCODE_INITIAL_DATA_DIR");
        if (fromEnv != null && !fromEnv.isBlank()) {
            return Path.of(fromEnv);
        }
        return SqlLoader.resolveMigrationsRoot().resolve("InitialData");
    }

    private int applySeedFile(String content) throws JsonProcessingException {
        Map<String, List<Map<String, Object>>> root = SeedSupport.parseSeedRoot(content);
        int insertedRows = 0;

        for (Map.Entry<String, List<Map<String, Object>>> table : root.entrySet()) {
            String tableName = table.getKey();
            List<Map<String, Object>> rows = table.getValue();
            if (rows.isEmpty()) {
                continue;
            }

            Map<String, Object> sample = SeedSupport.normalizeRow(rows.getFirst());
            List<String> uniqueColumns = new ArrayList<>(sample.keySet());
            if (uniqueColumns.isEmpty()) {
                continue;
            }

            Set<String> existing = loadExistingKeys(tableName, uniqueColumns);

            for (Map<String, Object> rawRow : rows) {
                Map<String, Object> row = SeedSupport.normalizeRow(rawRow);
                if (row.isEmpty()) {
                    continue;
                }
                String key = SeedSupport.buildRowKey(row, uniqueColumns);
                if (existing.contains(key)) {
                    continue;
                }

                List<String> cols = new ArrayList<>(row.keySet());
                List<Object> values = cols.stream().map(row::get).toList();
                String colSql = String.join(", ", cols.stream().map(c -> SeedSupport.quoteIdent(c, dbType)).toList());
                String placeholders = String.join(", ", cols.stream().map(c -> "?").toList());
                String sql = "INSERT INTO "
                        + SeedSupport.quoteIdent(tableName, dbType)
                        + " ("
                        + colSql
                        + ") VALUES ("
                        + placeholders
                        + ")";
                jdbc.update(sql, values.toArray());
                existing.add(key);
                insertedRows++;
            }
        }
        return insertedRows;
    }

    private Set<String> loadExistingKeys(String tableName, List<String> columns) {
        String selectCols =
                String.join(", ", columns.stream().map(c -> SeedSupport.quoteIdent(c, dbType)).toList());
        String sql = "SELECT " + selectCols + " FROM " + SeedSupport.quoteIdent(tableName, dbType);
        Set<String> keys = new HashSet<>();
        try {
            List<Map<String, Object>> rows = jdbc.queryForList(sql);
            for (Map<String, Object> er : rows) {
                Map<String, Object> normalized = new LinkedHashMap<>();
                for (String col : columns) {
                    Object val = er.get(col);
                    if (val == null) {
                        for (Map.Entry<String, Object> e : er.entrySet()) {
                            if (e.getKey().equalsIgnoreCase(col)) {
                                val = e.getValue();
                                break;
                            }
                        }
                    }
                    normalized.put(col, val);
                }
                keys.add(SeedSupport.buildRowKey(normalized, columns));
            }
        } catch (Exception ex) {
            log.warn("Seed could not SELECT existing rows from {}: {}", tableName, ex.getMessage());
        }
        return keys;
    }

    private boolean seedAlreadyApplied(String fileName, String hash) {
        List<Map<String, Object>> rows = jdbc.queryForList(historyCheckSql(dbType), fileName, hash);
        return !rows.isEmpty();
    }

    private static List<Path> listSeedFiles(Path dir) throws IOException {
        if (!Files.isDirectory(dir)) {
            return List.of();
        }
        try (Stream<Path> files = Files.list(dir)) {
            return files.filter(Files::isRegularFile)
                    .filter(p -> p.getFileName().toString().toLowerCase(Locale.ROOT).endsWith(".json"))
                    .sorted(Comparator.comparing(p -> p.getFileName().toString(), String.CASE_INSENSITIVE_ORDER))
                    .toList();
        }
    }

    private static String createSeedHistoryTableSql(DbConfig.QuickCodeDbType dbType) {
        return switch (dbType) {
            case MSSQL -> """
                    IF OBJECT_ID(N'dbo.%s', N'U') IS NULL
                    BEGIN
                      CREATE TABLE [dbo].[%s] (
                        [SeedFile] nvarchar(300) NOT NULL,
                        [ScriptHash] nvarchar(128) NOT NULL,
                        [AppliedAtUtc] datetime2 NOT NULL,
                        [InsertedRows] int NOT NULL,
                        [ElapsedMs] bigint NOT NULL DEFAULT 0,
                        PRIMARY KEY ([SeedFile], [ScriptHash])
                      );
                    END;"""
                    .formatted(HISTORY_TABLE, HISTORY_TABLE);
            case MYSQL -> """
                    CREATE TABLE IF NOT EXISTS `%s` (
                      `SeedFile` varchar(300) NOT NULL,
                      `ScriptHash` varchar(128) NOT NULL,
                      `AppliedAtUtc` datetime(6) NOT NULL,
                      `InsertedRows` int NOT NULL,
                      `ElapsedMs` bigint NOT NULL DEFAULT 0,
                      PRIMARY KEY (`SeedFile`, `ScriptHash`)
                    );"""
                    .formatted(HISTORY_TABLE);
            default -> """
                    CREATE TABLE IF NOT EXISTS "%s" (
                      "SeedFile" varchar(300) NOT NULL,
                      "ScriptHash" varchar(128) NOT NULL,
                      "AppliedAtUtc" timestamp with time zone NOT NULL,
                      "InsertedRows" int NOT NULL,
                      "ElapsedMs" bigint NOT NULL DEFAULT 0,
                      PRIMARY KEY ("SeedFile", "ScriptHash")
                    );"""
                    .formatted(HISTORY_TABLE);
        };
    }

    private static String historyCheckSql(DbConfig.QuickCodeDbType dbType) {
        return switch (dbType) {
            case MSSQL -> "SELECT 1 AS x FROM [dbo].[%s] WHERE [SeedFile] = ? AND [ScriptHash] = ?;"
                    .formatted(HISTORY_TABLE);
            case MYSQL -> "SELECT 1 AS x FROM `%s` WHERE `SeedFile` = ? AND `ScriptHash` = ? LIMIT 1;"
                    .formatted(HISTORY_TABLE);
            default -> "SELECT 1 FROM \"%s\" WHERE \"SeedFile\" = ? AND \"ScriptHash\" = ? LIMIT 1;"
                    .formatted(HISTORY_TABLE);
        };
    }

    private static String insertHistorySql(DbConfig.QuickCodeDbType dbType) {
        return switch (dbType) {
            case MSSQL -> """
                    INSERT INTO [dbo].[%s] ([SeedFile], [ScriptHash], [AppliedAtUtc], [InsertedRows], [ElapsedMs])
                    VALUES (?, ?, ?, ?, ?);"""
                    .formatted(HISTORY_TABLE);
            case MYSQL -> """
                    INSERT INTO `%s` (`SeedFile`, `ScriptHash`, `AppliedAtUtc`, `InsertedRows`, `ElapsedMs`)
                    VALUES (?, ?, ?, ?, ?);"""
                    .formatted(HISTORY_TABLE);
            default -> """
                    INSERT INTO "%s" ("SeedFile", "ScriptHash", "AppliedAtUtc", "InsertedRows", "ElapsedMs")
                    VALUES (?, ?, ?, ?, ?);"""
                    .formatted(HISTORY_TABLE);
        };
    }
}
