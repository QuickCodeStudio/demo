package com.quickcode.module.platform;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.quickcode.module.auditing.HealthPathUtil;
import com.quickcode.module.platform.observability.ElasticSink;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.filter.OncePerRequestFilter;

/** Nest {@code api-log.middleware.ts} — structured request timing log. */
public class ApiLogFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger("ApiLog");
    private static final ObjectMapper JSON = new ObjectMapper();

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        if (HealthPathUtil.isHealthPath(path) || SwaggerPathUtil.isSwaggerPath(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        long started = System.currentTimeMillis();
        String requestDatetime = Instant.now().toString();

        try {
            filterChain.doFilter(request, response);
        } finally {
            int status = response.getStatus();
            Map<String, Object> apiLog = new LinkedHashMap<>();
            apiLog.put("hostName", path);
            apiLog.put("clientIp", RateLimitFilter.clientKey(request));
            apiLog.put("httpStatusCode", String.valueOf(status));
            apiLog.put("elapsedTime", System.currentTimeMillis() - started);
            apiLog.put("requestDatetime", requestDatetime);
            apiLog.put("responseDatetime", Instant.now().toString());
            apiLog.put("method", request.getMethod());

            try {
                log.info("Api Log Message: {}", JSON.writeValueAsString(apiLog));
            } catch (JsonProcessingException ex) {
                log.info("Api Log Message: {}", apiLog);
            }

            Map<String, Object> elasticDoc = new LinkedHashMap<>(apiLog);
            elasticDoc.put("message", "Api Log Message");
            elasticDoc.put("level", "Information");
            ElasticSink.writeLog(elasticDoc);
        }
    }
}
