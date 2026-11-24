package com.quickcode.module.platform.observability;

import io.micrometer.prometheusmetrics.PrometheusMeterRegistry;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Nest {@code metrics.controller.ts} — Prometheus text scrape at {@code GET /metrics}. */
@RestController
public class MetricsController {

    private final PrometheusMeterRegistry prometheus;

    public MetricsController(PrometheusMeterRegistry prometheus) {
        this.prometheus = prometheus;
    }

    @GetMapping(value = "/metrics", produces = "text/plain; version=0.0.4;charset=utf-8")
    public String metrics() {
        return prometheus.scrape();
    }
}
