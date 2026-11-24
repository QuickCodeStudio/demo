package com.quickcode.module.platform.observability;

import com.quickcode.module.auditing.HealthPathUtil;
import com.quickcode.module.platform.SwaggerPathUtil;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.web.filter.OncePerRequestFilter;

/** Rust {@code metrics.rs} — record HTTP counters (exported via Prometheus scrape). */
public class HttpMetricsFilter extends OncePerRequestFilter {

    private final Counter requestsTotal;
    private final Counter serverErrorsTotal;

    public HttpMetricsFilter(MeterRegistry registry) {
        String service =
                firstNonBlank(System.getenv("MODULE_NAME"), System.getenv("AppSettings__ModuleName"), "Template0ModuleName");
        this.requestsTotal =
                Counter.builder("http_requests_total")
                        .description("Total HTTP requests")
                        .tag("service", service)
                        .register(registry);
        this.serverErrorsTotal =
                Counter.builder("http_server_errors_total")
                        .description("Total HTTP 5xx responses")
                        .tag("service", service)
                        .register(registry);
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        if (HealthPathUtil.isHealthPath(path) || SwaggerPathUtil.isSwaggerPath(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            filterChain.doFilter(request, response);
        } finally {
            requestsTotal.increment();
            int status = response.getStatus();
            if (status >= 500) {
                serverErrorsTotal.increment();
            }
        }
    }

    private static String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) {
                return v.trim();
            }
        }
        return "";
    }
}
