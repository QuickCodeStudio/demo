package com.quickcode.module.db;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.HashSet;
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

@Component
@Order(10)
public class MigrationRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(MigrationRunner.class);
    private static final String HISTORY_TABLE = "__QuickCodeSqlMigrations";

    private final JdbcTemplate jdbc;
    private final SqlScriptExecutor executor;
    private final DbConfig.QuickCodeDbType dbType;

    public MigrationRunner(JdbcTemplate jdbc, SqlScriptExecutor executor, DbConfig.QuickCodeDbType dbType) {
        this.jdbc = jdbc;
        this.executor = executor;
        this.dbType = dbType;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        if (!DbConfig.shouldRunMigration()) {
            log.info("RUN_MIGRATION disabled — skipping SQL migrations.");
            return;
        }
        if (dbType == DbConfig.QuickCodeDbType.INMEMORY) {
            return;
        }

        DbConfig.ensureDatabaseExists(dbType);

        Path migrationsDir = SqlLoader.resolveMigrationsRoot();
        String suffix = dbType.scriptSuffix();
        List<Path> scripts = listSqlScripts(migrationsDir, suffix);
        if (scripts.isEmpty()) {
            log.info("No QuickCode SQL migration scripts found in {} (suffix {})", migrationsDir, suffix);
            return;
        }

        executor.executeRawBatch(createHistoryTableSql(dbType));
        Set<String> applied = loadAppliedMigrationIds(dbType);

        for (Path script : scripts) {
            String migrationId = script.getFileName().toString();
            if (applied.contains(migrationId)) {
                continue;
            }
            String sql = SqlLoader.stripBom(Files.readString(script, StandardCharsets.UTF_8));
            if (sql.isBlank()) {
                continue;
            }
            log.info("Applying QuickCode SQL migration {}", migrationId);
            executor.executeRawBatch(sql);
            jdbc.update(
                    insertHistorySql(dbType),
                    migrationId,
                    sha256Hex(sql),
                    java.sql.Timestamp.from(Instant.now()));
            applied.add(migrationId);
        }
    }

    private Set<String> loadAppliedMigrationIds(DbConfig.QuickCodeDbType dbType) {
        List<Map<String, Object>> rows = jdbc.queryForList(selectAppliedSql(dbType));
        Set<String> applied = new HashSet<>();
        for (Map<String, Object> row : rows) {
            Object id = row.get("MigrationId");
            if (id == null && !row.isEmpty()) {
                id = row.values().iterator().next();
            }
            if (id != null) {
                applied.add(String.valueOf(id));
            }
        }
        return applied;
    }

    private static List<Path> listSqlScripts(Path dir, String suffix) throws IOException {
        if (!Files.isDirectory(dir)) {
            return List.of();
        }
        List<Path> results = new ArrayList<>();
        try (Stream<Path> walk = Files.walk(dir)) {
            walk.filter(Files::isRegularFile)
                    .filter(p -> {
                        String name = p.getFileName().toString().toLowerCase(Locale.ROOT);
                        return name.endsWith(suffix.toLowerCase(Locale.ROOT));
                    })
                    .filter(p -> !p.toString().replace('\\', '/').contains("/InitialData/"))
                    .forEach(results::add);
        }
        results.sort(Comparator.<Path, String>comparing(
                        p -> p.getFileName().toString(), String.CASE_INSENSITIVE_ORDER)
                .thenComparing(Path::toString));
        return results;
    }

    private static String createHistoryTableSql(DbConfig.QuickCodeDbType dbType) {
        return switch (dbType) {
            case MSSQL -> """
                    IF OBJECT_ID(N'dbo.%s', N'U') IS NULL
                    BEGIN
                      CREATE TABLE [dbo].[%s] (
                        [MigrationId] nvarchar(300) NOT NULL PRIMARY KEY,
                        [ScriptHash] nvarchar(128) NOT NULL,
                        [AppliedAtUtc] datetime2 NOT NULL
                      );
                    END;"""
                    .formatted(HISTORY_TABLE, HISTORY_TABLE);
            case MYSQL -> """
                    CREATE TABLE IF NOT EXISTS `%s` (
                      `MigrationId` varchar(300) NOT NULL PRIMARY KEY,
                      `ScriptHash` varchar(128) NOT NULL,
                      `AppliedAtUtc` datetime(6) NOT NULL
                    );"""
                    .formatted(HISTORY_TABLE);
            default -> """
                    CREATE TABLE IF NOT EXISTS "%s" (
                      "MigrationId" varchar(300) NOT NULL PRIMARY KEY,
                      "ScriptHash" varchar(128) NOT NULL,
                      "AppliedAtUtc" timestamp with time zone NOT NULL
                    );"""
                    .formatted(HISTORY_TABLE);
        };
    }

    private static String selectAppliedSql(DbConfig.QuickCodeDbType dbType) {
        return switch (dbType) {
            case MSSQL -> "SELECT [MigrationId] FROM [dbo].[%s];".formatted(HISTORY_TABLE);
            case MYSQL -> "SELECT `MigrationId` FROM `%s`;".formatted(HISTORY_TABLE);
            default -> "SELECT \"MigrationId\" FROM \"%s\";".formatted(HISTORY_TABLE);
        };
    }

    private static String insertHistorySql(DbConfig.QuickCodeDbType dbType) {
        return switch (dbType) {
            case MSSQL -> "INSERT INTO [dbo].[%s] ([MigrationId], [ScriptHash], [AppliedAtUtc]) VALUES (?, ?, ?);"
                    .formatted(HISTORY_TABLE);
            case MYSQL -> "INSERT INTO `%s` (`MigrationId`, `ScriptHash`, `AppliedAtUtc`) VALUES (?, ?, ?);"
                    .formatted(HISTORY_TABLE);
            default -> "INSERT INTO \"%s\" (\"MigrationId\", \"ScriptHash\", \"AppliedAtUtc\") VALUES (?, ?, ?);"
                    .formatted(HISTORY_TABLE);
        };
    }

    private static String sha256Hex(String text) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(text.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().withUpperCase().formatHex(hash);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException(ex);
        }
    }
}
