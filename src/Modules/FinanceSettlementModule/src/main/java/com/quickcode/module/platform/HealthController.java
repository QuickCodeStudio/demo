package com.quickcode.module.platform;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** HealthChecks.UI-like JSON at {@code GET /hc} (C# / Nest parity). */
@RestController
public class HealthController {

    private final JdbcTemplate jdbc;

    public HealthController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping({"/hc", "/health"})
    public ResponseEntity<Map<String, Object>> healthCheck() {
        long started = System.nanoTime();
        Map<String, Object> entries = new LinkedHashMap<>();
        boolean healthy = true;

        long dbStarted = System.nanoTime();
        try {
            jdbc.queryForObject("SELECT 1", Integer.class);
            entries.put(
                    "database",
                    entry("Healthy", Duration.ofNanos(System.nanoTime() - dbStarted), null, List.of("ready")));
        } catch (Exception ex) {
            healthy = false;
            entries.put(
                    "database",
                    entry(
                            "Unhealthy",
                            Duration.ofNanos(System.nanoTime() - dbStarted),
                            ex.getMessage(),
                            List.of("ready")));
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", healthy ? "Healthy" : "Unhealthy");
        body.put("totalDuration", formatDuration(Duration.ofNanos(System.nanoTime() - started)));
        body.put("entries", entries);

        HttpStatus status = healthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
        return ResponseEntity.status(status).body(body);
    }

    private static Map<String, Object> entry(
            String status, Duration duration, String description, List<String> tags) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("status", status);
        map.put("duration", formatDuration(duration));
        if (description != null) {
            map.put("description", description);
        }
        map.put("data", Map.of());
        map.put("tags", tags);
        return map;
    }

    /** .NET TimeSpan-like {@code hh:mm:ss.fffffff}. */
    static String formatDuration(Duration d) {
        long totalSec = d.getSeconds();
        long hours = totalSec / 3600;
        long minutes = (totalSec % 3600) / 60;
        long seconds = totalSec % 60;
        long fracTicks = d.getNano() / 100;
        String frac = String.format("%07d", fracTicks).substring(0, 7);
        return String.format("%02d:%02d:%02d.%s", hours, minutes, seconds, frac);
    }
}
