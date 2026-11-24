package com.quickcode.module.platform;

import com.quickcode.module.auditing.HealthPathUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.filter.OncePerRequestFilter;

/** Nest {@code rate-limit.middleware.ts} — in-memory fixed window. */
public class RateLimitFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitFilter.class);

    enum Policy {
        AUTH,
        REFRESH,
        GENERAL
    }

    private record Bucket(int count, long resetAtMillis) {}

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final boolean enabled;
    private final int windowSeconds;
    private final int generalPermit;
    private final int authPermit;
    private final int refreshPermit;

    public RateLimitFilter() {
        this.enabled = !"false".equalsIgnoreCase(env("RATE_LIMIT_ENABLED", "true"));
        this.windowSeconds = Math.max(1, parseInt(env("RATE_LIMIT_WINDOW_SECONDS", "60"), 60));
        this.generalPermit = Math.max(1, parseInt(env("RATE_LIMIT_PERMIT", "1000"), 1000));
        this.authPermit = Math.max(1, parseInt(env("RATE_LIMIT_AUTH_PERMIT", "10"), 10));
        this.refreshPermit = Math.max(1, parseInt(env("RATE_LIMIT_REFRESH_PERMIT", "60"), 60));
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        if (!enabled || HealthPathUtil.isHealthPath(path) || SwaggerPathUtil.isSwaggerPath(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        Policy policy = policyKey(path);
        int permit = permits(policy);
        String key = clientKey(request) + "|" + policy.name().toLowerCase(Locale.ROOT);
        long now = System.currentTimeMillis();

        Bucket bucket =
                buckets.compute(
                        key,
                        (k, existing) -> {
                            if (existing == null || existing.resetAtMillis() <= now) {
                                return new Bucket(0, now + windowSeconds * 1000L);
                            }
                            return existing;
                        });

        int nextCount = bucket.count() + 1;
        buckets.put(key, new Bucket(nextCount, bucket.resetAtMillis()));

        if (nextCount > permit) {
            long retryAfter = Math.max(1, (bucket.resetAtMillis() - now + 999) / 1000);
            response.setHeader("Retry-After", String.valueOf(retryAfter));
            log.warn("Rate limit exceeded for {} (limit={})", key, permit);
            response.setStatus(429);
            response.setContentType("text/plain;charset=UTF-8");
            response.getWriter().write("Rate limit exceeded. Please try again later.");
            return;
        }

        filterChain.doFilter(request, response);
    }

    static Policy policyKey(String path) {
        if (path == null) {
            return Policy.GENERAL;
        }
        String p = path.toLowerCase(Locale.ROOT);
        if (p.contains("/api/auth/refresh")) {
            return Policy.REFRESH;
        }
        if (p.contains("/api/auth/login") || p.contains("/api/auth/token")) {
            return Policy.AUTH;
        }
        return Policy.GENERAL;
    }

    static String clientKey(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        String remote = request.getRemoteAddr();
        return remote != null && !remote.isBlank() ? remote : "unknown";
    }

    private int permits(Policy policy) {
        return switch (policy) {
            case AUTH -> authPermit;
            case REFRESH -> refreshPermit;
            case GENERAL -> generalPermit;
        };
    }

    private static String env(String name, String defaultValue) {
        String v = System.getenv(name);
        return v == null || v.isBlank() ? defaultValue : v.trim();
    }

    private static int parseInt(String raw, int defaultValue) {
        try {
            return Integer.parseInt(raw.trim());
        } catch (NumberFormatException ex) {
            return defaultValue;
        }
    }
}
