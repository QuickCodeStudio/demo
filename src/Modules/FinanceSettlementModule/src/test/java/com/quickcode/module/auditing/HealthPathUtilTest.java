package com.quickcode.module.auditing;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class HealthPathUtilTest {

    @Test
    void isHealthPathSkipsProbes() {
        assertTrue(HealthPathUtil.isHealthPath("/hc"));
        assertTrue(HealthPathUtil.isHealthPath("/hc/"));
        assertTrue(HealthPathUtil.isHealthPath("/health"));
        assertTrue(HealthPathUtil.isHealthPath("/metrics"));
        assertTrue(HealthPathUtil.isHealthPath("/api/module/metrics"));
        assertFalse(HealthPathUtil.isHealthPath("/api/pricing-engine-module/commission-models"));
    }
}
