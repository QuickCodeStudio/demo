package com.quickcode.module.platform;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

@Configuration
public class CorsConfig {

    private static final Logger log = LoggerFactory.getLogger(CorsConfig.class);

    @Bean
    CorsFilter corsFilter() {
        return new CorsFilter(corsConfigurationSource());
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        return request -> buildForRequest(request);
    }

    static CorsConfiguration buildForRequest(HttpServletRequest request) {
        String raw =
                firstNonBlank(
                        System.getenv("CORS_ALLOW_ORIGINS"),
                        System.getenv("CorsSettings__AllowOrigins"),
                        "");
        List<String> list = CorsOriginMatcher.parseOriginsList(raw);

        CorsConfiguration config = new CorsConfiguration();
        config.setAllowCredentials(true);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.addAllowedHeader(CorsConfiguration.ALL);
        config.setMaxAge(3600L);

        if (list.isEmpty()) {
            log.warn(
                    "CORS_ALLOW_ORIGINS / CorsSettings__AllowOrigins is missing or empty; permissive CORS");
            config.addAllowedOriginPattern(CorsConfiguration.ALL);
            return config;
        }
        if (list.size() == 1 && "*".equals(list.get(0))) {
            config.addAllowedOriginPattern(CorsConfiguration.ALL);
            return config;
        }

        String origin = request.getHeader("Origin");
        if (origin != null && CorsOriginMatcher.anyOriginMatches(list, origin)) {
            config.addAllowedOrigin(origin);
        } else if (origin == null) {
            for (String p : list) {
                if (p.startsWith("*.")) {
                    config.addAllowedOriginPattern(p);
                } else {
                    config.addAllowedOrigin(p);
                }
            }
        }
        return config;
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
