package com.quickcode.module.platform;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.web.filter.OncePerRequestFilter;

/** Nest {@code rewriteSwaggerIndexHtmlUrl} — gateway iframe path rewrite. */
public class SwaggerGatewayRewriteFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String uri = request.getRequestURI();
        String rewritten = SwaggerPathUtil.rewriteSwaggerIndexHtmlUrl(uri);
        if (rewritten != null && !rewritten.equals(uri)) {
            filterChain.doFilter(new RewrittenRequest(request, rewritten), response);
            return;
        }
        filterChain.doFilter(request, response);
    }

    private static final class RewrittenRequest extends HttpServletRequestWrapper {

        private final String path;

        RewrittenRequest(HttpServletRequest request, String path) {
            super(request);
            this.path = path;
        }

        @Override
        public String getRequestURI() {
            return path;
        }

        @Override
        public String getServletPath() {
            return path;
        }
    }
}
