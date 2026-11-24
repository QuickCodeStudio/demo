package com.quickcode.module.platform;

import java.util.Locale;

/** Nest {@code swagger-ui.ts} path checks. */
public final class SwaggerPathUtil {

    private SwaggerPathUtil() {}

    public static boolean isSwaggerPath(String path) {
        if (path == null || path.isBlank()) {
            return false;
        }
        String pathname = path.split("\\?", 2)[0].toLowerCase(Locale.ROOT);
        return pathname.equals("/swagger") || pathname.startsWith("/swagger/");
    }

    /** Gateway iframe {@code /swagger/index.html} → {@code /swagger} (no redirect). */
    public static String rewriteSwaggerIndexHtmlUrl(String url) {
        if (url == null) {
            return null;
        }
        int q = url.indexOf('?');
        int hash = url.indexOf('#');
        int end = url.length();
        if (q >= 0) {
            end = q;
        }
        if (hash >= 0 && hash < end) {
            end = hash;
        }
        String pathname = url.substring(0, end);
        if (!"/swagger/index.html".equals(pathname)) {
            return url;
        }
        return "/swagger" + url.substring(end);
    }
}
