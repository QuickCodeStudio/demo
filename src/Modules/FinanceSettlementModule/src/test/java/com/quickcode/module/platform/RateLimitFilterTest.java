package com.quickcode.module.platform;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class RateLimitFilterTest {

    @Test
    void policyKeyMatchesAuthPaths() {
        assertEquals(RateLimitFilter.Policy.AUTH, RateLimitFilter.policyKey("/api/auth/login"));
        assertEquals(RateLimitFilter.Policy.AUTH, RateLimitFilter.policyKey("/api/Auth/Token"));
        assertEquals(RateLimitFilter.Policy.REFRESH, RateLimitFilter.policyKey("/api/auth/refresh"));
        assertEquals(RateLimitFilter.Policy.GENERAL, RateLimitFilter.policyKey("/api/products"));
    }
}
