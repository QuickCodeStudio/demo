package com.quickcode.module.db;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Locale;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

@Configuration
public class DbConfig {

    private static final Logger log = LoggerFactory.getLogger(DbConfig.class);

    @Bean
    DataSource dataSource(
            @Value("${quickcode.db-type:postgresql}") String dbTypeRaw,
            @Value("${quickcode.db-host:localhost}") String host,
            @Value("${quickcode.db-port:}") String portRaw,
            @Value("${quickcode.db-username:}") String usernameRaw,
            @Value("${quickcode.db-password:}") String passwordRaw,
            @Value("${quickcode.db-database:template0}") String database) {
        QuickCodeDbType dbType = QuickCodeDbType.normalize(dbTypeRaw);
        int port = portRaw.isBlank() ? dbType.defaultPort() : Integer.parseInt(portRaw.trim());
        String username = usernameRaw.isBlank() ? dbType.defaultUser() : usernameRaw;
        String password = passwordRaw.isBlank() ? dbType.defaultPassword() : passwordRaw;

        // Create the target database before Hikari connects — MigrationRunner runs too late
        // (DataSource + BackgroundAuditLogWriter are constructed during context refresh).
        ensureDatabaseExists(dbType);

        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(dbType.jdbcUrl(host, port, database));
        config.setUsername(username);
        config.setPassword(password);
        config.setMaximumPoolSize(10);
        return new HikariDataSource(config);
    }

    @Bean
    JdbcTemplate jdbcTemplate(DataSource dataSource) {
        return new JdbcTemplate(dataSource);
    }

    @Bean
    NamedParameterJdbcTemplate namedParameterJdbcTemplate(DataSource dataSource) {
        return new NamedParameterJdbcTemplate(dataSource);
    }

    @Bean
    QuickCodeDbType quickCodeDbType(@Value("${quickcode.db-type:postgresql}") String raw) {
        return QuickCodeDbType.normalize(raw);
    }

    public static boolean shouldRunMigration() {
        String flag = env("RUN_MIGRATION", "yes").trim().toLowerCase(Locale.ROOT);
        return !flag.equals("no") && !flag.equals("false") && !flag.equals("0");
    }

    public static void ensureDatabaseExists(QuickCodeDbType dbType) {
        if (dbType == QuickCodeDbType.INMEMORY) {
            return;
        }
        String host = env("DB_HOST", "localhost");
        int port = parsePort(env("DB_PORT", ""), dbType.defaultPort());
        String user = env("DB_USERNAME", dbType.defaultUser());
        String password = env("DB_PASSWORD", dbType.defaultPassword());
        String database = env("DB_DATABASE", "template0");
        if (database.isBlank()) {
            return;
        }

        switch (dbType) {
            case POSTGRESQL -> ensurePostgres(host, port, user, password, database);
            case MYSQL -> ensureMysql(host, port, user, password, database);
            case MSSQL -> ensureMssql(host, port, user, password, database);
            default -> {}
        }
    }

    private static void ensurePostgres(String host, int port, String user, String password, String database) {
        String[] adminCandidates = {
            env("DB_ADMIN_DATABASE", ""),
            "postgres",
            user,
            "template1"
        };
        SQLException last = null;
        for (String adminDb : adminCandidates) {
            if (adminDb == null || adminDb.isBlank() || adminDb.equals(database)) {
                continue;
            }
            String url = QuickCodeDbType.POSTGRESQL.jdbcUrl(host, port, adminDb);
            try (Connection conn = DriverManager.getConnection(url, user, password);
                    Statement st = conn.createStatement()) {
                String quoted = database.replace("\"", "\"\"");
                st.executeUpdate("CREATE DATABASE \"" + quoted + "\" WITH ENCODING = 'UTF8'");
                log.info("PostgreSQL: database '{}' created.", database);
                return;
            } catch (SQLException ex) {
                if ("42P04".equals(ex.getSQLState())) {
                    log.info("PostgreSQL: database '{}' already exists.", database);
                    return;
                }
                last = ex;
            }
        }
        if (last != null) {
            throw new IllegalStateException("PostgreSQL: could not ensure database '" + database + "'", last);
        }
    }

    private static void ensureMssql(String host, int port, String user, String password, String database) {
        String url = QuickCodeDbType.MSSQL.jdbcUrl(host, port, "master");
        String nameLiteral = database.replace("'", "''");
        String nameBracket = database.replace("]", "]]");
        try (Connection conn = DriverManager.getConnection(url, user, password);
                Statement st = conn.createStatement()) {
            st.execute(
                    "IF DB_ID(N'" + nameLiteral + "') IS NULL CREATE DATABASE [" + nameBracket + "];");
            log.info("SQL Server: database '{}' is available (created if missing).", database);
        } catch (SQLException ex) {
            throw new IllegalStateException("SQL Server: could not ensure database '" + database + "'", ex);
        }
    }

    private static void ensureMysql(String host, int port, String user, String password, String database) {
        String url = QuickCodeDbType.MYSQL.jdbcUrl(host, port, "");
        try (Connection conn = DriverManager.getConnection(url, user, password);
                Statement st = conn.createStatement()) {
            String safe = database.replace("`", "``");
            st.executeUpdate("CREATE DATABASE IF NOT EXISTS `" + safe + "`");
            log.info("MySQL: database '{}' is available (created if missing).", database);
        } catch (SQLException ex) {
            throw new IllegalStateException("MySQL: could not ensure database '" + database + "'", ex);
        }
    }

    private static String env(String key, String defaultValue) {
        String v = System.getenv(key);
        return v == null || v.isBlank() ? defaultValue : v;
    }

    private static int parsePort(String raw, int defaultPort) {
        return raw.isBlank() ? defaultPort : Integer.parseInt(raw.trim());
    }

    public enum QuickCodeDbType {
        POSTGRESQL("postgresql"),
        MSSQL("mssql"),
        MYSQL("mysql"),
        INMEMORY("inmemory");

        private final String key;

        QuickCodeDbType(String key) {
            this.key = key;
        }

        public static QuickCodeDbType normalize(String raw) {
            String t = (raw == null ? "postgresql" : raw).trim().toLowerCase(Locale.ROOT);
            if (t.equals("inmemory")) {
                return INMEMORY;
            }
            if (t.equals("postgres") || t.equals("postgresql")) {
                return POSTGRESQL;
            }
            if (t.equals("mysql")) {
                return MYSQL;
            }
            if (t.equals("mssql") || t.equals("sqlserver") || t.equals("sql server")) {
                return MSSQL;
            }
            return POSTGRESQL;
        }

        public String scriptSuffix() {
            return "." + key + ".sql";
        }

        public int defaultPort() {
            return switch (this) {
                case MSSQL -> 1433;
                case MYSQL -> 3306;
                default -> 5432;
            };
        }

        public String defaultUser() {
            return switch (this) {
                case MSSQL -> "sa";
                default -> "docker";
            };
        }

        public String defaultPassword() {
            return switch (this) {
                case MSSQL -> "Pass@word";
                default -> "dockerf";
            };
        }

        public String jdbcUrl(String host, int port, String database) {
            return switch (this) {
                case MSSQL -> "jdbc:sqlserver://" + host + ":" + port
                        + ";databaseName=" + database
                        + ";encrypt=false;trustServerCertificate=true";
                case MYSQL -> {
                    String db = database.isBlank() ? "" : "/" + database;
                    yield "jdbc:mysql://" + host + ":" + port + db
                            + "?allowPublicKeyRetrieval=true&useSSL=false";
                }
                default -> "jdbc:postgresql://" + host + ":" + port + "/" + database;
            };
        }
    }
}
