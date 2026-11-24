package com.quickcode.module.platform;

import com.nimbusds.jose.JWSVerifier;
import com.nimbusds.jose.crypto.RSASSAVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.quickcode.module.auditing.HealthPathUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.security.KeyFactory;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Nest parity — validate Gateway RS256 Bearer when present; anonymous allowed when omitted.
 */
public class GatewayJwtFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(GatewayJwtFilter.class);
    private static final String DEFAULT_ISSUER = "quickcode-gateway";

    private final RSAPublicKey publicKey;
    private final String issuer;
    private final String audience;

    public GatewayJwtFilter() {
        this.publicKey = loadPublicKey();
        this.issuer =
                firstNonBlank(
                        System.getenv("GATEWAY_JWT_ISSUER"),
                        System.getenv("GatewayServiceTokenSettings__Issuer"),
                        DEFAULT_ISSUER);
        this.audience =
                firstNonBlank(
                        System.getenv("MODULE_NAME"),
                        System.getenv("AppSettings__ModuleName"),
                        "Template0ModuleName");
        if (publicKey == null) {
            log.warn("GATEWAY_JWT_PUBLIC_KEY not set — Bearer tokens will not be validated");
        }
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

        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ") || publicKey == null) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = header.substring("Bearer ".length()).trim();
        try {
            SignedJWT jwt = SignedJWT.parse(token);
            JWSVerifier verifier = new RSASSAVerifier(publicKey);
            if (!jwt.verify(verifier)) {
                unauthorized(response, "Invalid token signature");
                return;
            }
            JWTClaimsSet claims = jwt.getJWTClaimsSet();
            if (!issuer.equals(claims.getIssuer())) {
                unauthorized(response, "Invalid token issuer");
                return;
            }
            if (!audienceMatches(claims, audience)) {
                unauthorized(response, "Invalid token audience");
                return;
            }
            if (claims.getExpirationTime() != null
                    && claims.getExpirationTime().toInstant().isBefore(java.time.Instant.now())) {
                unauthorized(response, "Token expired");
                return;
            }
            String sub = claims.getSubject();
            if (sub != null && !sub.isBlank()) {
                request.setAttribute("gatewayUserId", sub);
            }
            filterChain.doFilter(request, response);
        } catch (Exception ex) {
            log.warn("Gateway JWT validation failed: {}", ex.getMessage());
            unauthorized(response, "Unauthorized");
        }
    }

    private static void unauthorized(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.getWriter().write("{\"message\":\"" + message + "\"}");
    }

    private static boolean audienceMatches(JWTClaimsSet claims, String expected) {
        java.util.List<String> aud = claims.getAudience();
        return aud != null && aud.contains(expected);
    }

    static RSAPublicKey loadPublicKey() {
        String raw =
                firstNonBlank(
                        System.getenv("GATEWAY_JWT_PUBLIC_KEY"),
                        System.getenv("QUICKCODE_GATEWAY_JWT_PUBLIC_KEY"),
                        null);
        if (raw == null) {
            return null;
        }
        try {
            if (raw.contains("BEGIN")) {
                return (RSAPublicKey)
                        java.security.KeyFactory.getInstance("RSA")
                                .generatePublic(
                                        new java.security.spec.X509EncodedKeySpec(
                                                pemToDer(raw)));
            }
            byte[] der = Base64.getDecoder().decode(raw.trim());
            KeyFactory kf = KeyFactory.getInstance("RSA");
            return (RSAPublicKey) kf.generatePublic(new X509EncodedKeySpec(der));
        } catch (Exception ex) {
            log.warn("Failed to parse GATEWAY_JWT_PUBLIC_KEY", ex);
            return null;
        }
    }

    private static byte[] pemToDer(String pem) {
        String normalized =
                pem.replace("-----BEGIN PUBLIC KEY-----", "")
                        .replace("-----END PUBLIC KEY-----", "")
                        .replaceAll("\\s", "");
        return Base64.getDecoder().decode(normalized);
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
