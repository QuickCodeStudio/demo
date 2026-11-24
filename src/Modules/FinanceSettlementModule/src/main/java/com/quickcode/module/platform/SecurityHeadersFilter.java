package com.quickcode.module.platform;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.web.filter.OncePerRequestFilter;

/** Nest {@code security-headers.middleware.ts} parity. */
public class SecurityHeadersFilter extends OncePerRequestFilter {

    private static final String CSP =
            "default-src 'self'; "
                    + "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: "
                    + "https://ajax.googleapis.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net "
                    + "https://gitcdn.github.io https://code.jquery.com; "
                    + "style-src 'self' 'unsafe-inline' "
                    + "https://fonts.googleapis.com https://cdnjs.cloudflare.com https://gitcdn.github.io "
                    + "https://cdn.jsdelivr.net; "
                    + "font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com "
                    + "https://cdn.jsdelivr.net; "
                    + "img-src 'self' data: blob: https:; "
                    + "worker-src 'self' blob:; "
                    + "child-src 'self' blob:; "
                    + "connect-src 'self'; "
                    + "frame-src 'self' http://localhost:* https://localhost:* https://*.quickcode.net "
                    + "https://*.europe-west1.run.app; "
                    + "frame-ancestors 'self';";

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        setIfAbsent(response, "Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
        setIfAbsent(response, "X-Content-Type-Options", "nosniff");
        setIfAbsent(response, "X-Frame-Options", "SAMEORIGIN");
        setIfAbsent(response, "X-XSS-Protection", "1; mode=block");
        setIfAbsent(response, "Referrer-Policy", "strict-origin-when-cross-origin");
        setIfAbsent(
                response,
                "Permissions-Policy",
                "geolocation=(), microphone=(), camera=(), payment=()");
        setIfAbsent(response, "Content-Security-Policy", CSP);
        setIfAbsent(response, "X-Permitted-Cross-Domain-Policies", "none");
        setIfAbsent(response, "X-Download-Options", "noopen");
        setIfAbsent(response, "X-DNS-Prefetch-Control", "off");

        String path = request.getRequestURI();
        if (!SwaggerPathUtil.isSwaggerPath(path)) {
            setIfAbsent(response, "Cross-Origin-Embedder-Policy", "require-corp");
            setIfAbsent(response, "Cross-Origin-Opener-Policy", "same-origin");
            setIfAbsent(response, "Cross-Origin-Resource-Policy", "same-origin");
        }

        filterChain.doFilter(request, response);
    }

    private static void setIfAbsent(HttpServletResponse response, String name, String value) {
        if (!response.containsHeader(name)) {
            response.setHeader(name, value);
        }
    }
}
