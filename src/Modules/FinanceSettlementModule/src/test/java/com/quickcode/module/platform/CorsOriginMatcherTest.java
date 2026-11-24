package com.quickcode.module.platform;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class CorsOriginMatcherTest {

    @Test
    void wildcardSubdomainMatches() {
        assertTrue(CorsOriginMatcher.originMatches("*.example.com", "https://app.example.com"));
        assertTrue(CorsOriginMatcher.originMatches("*.example.com", "https://example.com"));
        assertFalse(CorsOriginMatcher.originMatches("*.example.com", "https://evil.com"));
    }

    @Test
    void exactOriginMatches() {
        assertTrue(CorsOriginMatcher.originMatches("https://app.example.com", "https://app.example.com"));
    }

    @Test
    void parseOriginsListHonorsBareStar() {
        assertTrue(CorsOriginMatcher.parseOriginsList("*").contains("*"));
        assertTrue(CorsOriginMatcher.parseOriginsList("https://a.com,*.b.com").size() >= 2);
    }
}
