package com.quickcode.module.platform;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.quickcode.module.platform.observability.OtelBootstrap;
import org.junit.jupiter.api.Test;

class OtelBootstrapTest {

    @Test
    void normalizesGrpc4317ToHttpMetrics() {
        assertEquals(
                "http://localhost:4318/v1/metrics",
                OtelBootstrap.toOtlpHttpMetricsUrl("http://localhost:4317"));
    }

    @Test
    void keepsExplicitMetricsPath() {
        assertEquals(
                "http://collector:4318/v1/metrics",
                OtelBootstrap.toOtlpHttpMetricsUrl("http://collector:4318/v1/metrics"));
    }
}
