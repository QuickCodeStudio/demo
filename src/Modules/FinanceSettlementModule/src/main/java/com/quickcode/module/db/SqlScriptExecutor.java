package com.quickcode.module.db;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.ColumnMapRowMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class SqlScriptExecutor {

    private final JdbcTemplate jdbc;
    private final NamedParameterJdbcTemplate namedJdbc;
    private final SqlLoader sqlLoader;
    private final DbConfig.QuickCodeDbType dbType;

    public SqlScriptExecutor(
            JdbcTemplate jdbc,
            NamedParameterJdbcTemplate namedJdbc,
            SqlLoader sqlLoader,
            DbConfig.QuickCodeDbType dbType) {
        this.jdbc = jdbc;
        this.namedJdbc = namedJdbc;
        this.sqlLoader = sqlLoader;
        this.dbType = dbType;
    }

    /**
     * Runs a named script and returns any result-set rows.
     * UPDATE/DELETE/INSERT without OUTPUT/RETURNING succeed with an empty list
     * (MSSQL JDBC rejects {@code queryForList} when there is no ResultSet).
     */
    public List<Map<String, Object>> queryNamedScript(
            String className, String kind, String scriptName, Map<String, ?> named) {
        String raw = sqlLoader.loadSql(className, kind, scriptName);
        SqlLoader.BoundSql bound = sqlLoader.bindNamedParams(raw, named, dbType);
        return executeReturningMaps(bound);
    }

    public int executeNamedScript(String className, String kind, String scriptName, Map<String, ?> named) {
        String raw = sqlLoader.loadSql(className, kind, scriptName);
        SqlLoader.BoundSql bound = sqlLoader.bindNamedParams(raw, named, dbType);
        return jdbc.update(bound.text(), bound.params().toArray());
    }

    public List<Map<String, Object>> queryNamedSql(String sql, Map<String, ?> named) {
        SqlLoader.BoundSql bound = sqlLoader.bindNamedParams(sql, named, dbType);
        return executeReturningMaps(bound);
    }

    public void executeRawBatch(String sql) {
        for (String batch : splitCommands(sql, dbType)) {
            if (!batch.isBlank()) {
                jdbc.execute(batch);
            }
        }
    }

    public void executeNamedSql(String sql, Map<String, ?> named) {
        String rewritten = rewriteToSpringNamed(sql);
        namedJdbc.update(rewritten, new MapSqlParameterSource(named));
    }

    private List<Map<String, Object>> executeReturningMaps(SqlLoader.BoundSql bound) {
        return jdbc.execute(
                (org.springframework.jdbc.core.ConnectionCallback<List<Map<String, Object>>>) connection -> {
                    try (PreparedStatement ps = connection.prepareStatement(bound.text())) {
                        List<Object> params = bound.params();
                        for (int i = 0; i < params.size(); i++) {
                            ps.setObject(i + 1, params.get(i));
                        }
                        boolean isResultSet = ps.execute();
                        List<Map<String, Object>> rows = new ArrayList<>();
                        ColumnMapRowMapper mapper = new ColumnMapRowMapper();
                        while (true) {
                            if (isResultSet) {
                                try (ResultSet rs = ps.getResultSet()) {
                                    int rowNum = 0;
                                    while (rs.next()) {
                                        rows.add(mapper.mapRow(rs, rowNum++));
                                    }
                                }
                            } else if (ps.getUpdateCount() == -1) {
                                break;
                            }
                            isResultSet = ps.getMoreResults();
                        }
                        return rows;
                    }
                });
    }

    /** Optional path: keep @PRM_* in SQL but bind via Spring {@code :name} syntax. */
    private static String rewriteToSpringNamed(String sql) {
        return sql.replaceAll("@([A-Za-z_][A-Za-z0-9_]*)", ":$1");
    }

    static List<String> splitCommands(String sqlText, DbConfig.QuickCodeDbType dbType) {
        if (dbType != DbConfig.QuickCodeDbType.MSSQL) {
            return List.of(sqlText);
        }
        java.util.ArrayList<String> commands = new java.util.ArrayList<>();
        StringBuilder current = new StringBuilder();
        for (String line : sqlText.split("\\R")) {
            if (line.trim().equalsIgnoreCase("GO")) {
                if (!current.toString().isBlank()) {
                    commands.add(current.toString());
                }
                current.setLength(0);
            } else {
                current.append(line).append('\n');
            }
        }
        if (!current.toString().isBlank()) {
            commands.add(current.toString());
        }
        return commands;
    }
}
