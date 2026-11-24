package com.quickcode.module.platform.http;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.security.KeyFactory;
import java.security.interfaces.RSAPrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/** Nest / Rust mint_jwt parity for inter-module Bearer tokens. */
@Component
public class GatewayServiceTokenGenerator {

    private static final Logger log = LoggerFactory.getLogger(GatewayServiceTokenGenerator.class);
    private static final String DEFAULT_ISSUER = "quickcode-gateway";

    public String mint(String targetModuleName) {
        RSAPrivateKey key = loadPrivateKey();
        if (key == null) {
            return null;
        }
        try {
            String issuer =
                    firstNonBlank(
                            System.getenv("GATEWAY_JWT_ISSUER"),
                            System.getenv("GatewayServiceTokenSettings__Issuer"),
                            DEFAULT_ISSUER);
            int ttl =
                    parseInt(System.getenv("GATEWAY_JWT_EXPIRATION_SECONDS"), 60);
            Instant now = Instant.now();
            JWTClaimsSet claims =
                    new JWTClaimsSet.Builder()
                            .subject("gateway")
                            .issuer(issuer)
                            .audience(targetModuleName)
                            .issueTime(Date.from(now))
                            .expirationTime(Date.from(now.plusSeconds(ttl)))
                            .jwtID(UUID.randomUUID().toString())
                            .claim("PermissionGroupName", "InternalService")
                            .build();
            SignedJWT signed = new SignedJWT(new JWSHeader(JWSAlgorithm.RS256), claims);
            signed.sign(new RSASSASigner(key));
            return signed.serialize();
        } catch (Exception ex) {
            log.warn("Failed to mint gateway service token: {}", ex.getMessage());
            return null;
        }
    }

    static RSAPrivateKey loadPrivateKey() {
        String raw =
                firstNonBlank(
                        System.getenv("GATEWAY_JWT_PRIVATE_KEY"),
                        System.getenv("QUICKCODE_GATEWAY_JWT_PRIVATE_KEY"),
                        null);
        if (raw == null) {
            return null;
        }
        raw = raw.trim();
        try {
            if (raw.contains("BEGIN")) {
                return (RSAPrivateKey)
                        KeyFactory.getInstance("RSA")
                                .generatePrivate(
                                        new PKCS8EncodedKeySpec(pemPrivateToDer(raw)));
            }
            byte[] decoded = Base64.getDecoder().decode(raw);
            String asUtf8 = new String(decoded);
            if (asUtf8.contains("BEGIN")) {
                return (RSAPrivateKey)
                        KeyFactory.getInstance("RSA")
                                .generatePrivate(new PKCS8EncodedKeySpec(pemPrivateToDer(asUtf8)));
            }
            String pem = wrapPkcs8DerAsPem(decoded);
            return (RSAPrivateKey)
                    KeyFactory.getInstance("RSA")
                            .generatePrivate(new PKCS8EncodedKeySpec(pemPrivateToDer(pem)));
        } catch (Exception ex) {
            log.warn("Failed to parse GATEWAY_JWT_PRIVATE_KEY", ex);
            return null;
        }
    }

    private static byte[] pemPrivateToDer(String pem) {
        String normalized =
                pem.replace("-----BEGIN PRIVATE KEY-----", "")
                        .replace("-----END PRIVATE KEY-----", "")
                        .replace("-----BEGIN RSA PRIVATE KEY-----", "")
                        .replace("-----END RSA PRIVATE KEY-----", "")
                        .replaceAll("\\s", "");
        return Base64.getDecoder().decode(normalized);
    }

    private static String wrapPkcs8DerAsPem(byte[] der) {
        String b64 = Base64.getEncoder().encodeToString(der);
        StringBuilder out = new StringBuilder("-----BEGIN PRIVATE KEY-----\n");
        for (int i = 0; i < b64.length(); i += 64) {
            out.append(b64, i, Math.min(i + 64, b64.length())).append('\n');
        }
        out.append("-----END PRIVATE KEY-----\n");
        return out.toString();
    }

    private static int parseInt(String raw, int defaultValue) {
        if (raw == null || raw.isBlank()) {
            return defaultValue;
        }
        try {
            int v = Integer.parseInt(raw.trim());
            return v > 0 ? v : defaultValue;
        } catch (NumberFormatException ex) {
            return defaultValue;
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
