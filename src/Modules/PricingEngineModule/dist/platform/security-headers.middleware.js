"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityHeadersMiddleware = void 0;
const common_1 = require("@nestjs/common");
const swagger_ui_1 = require("./swagger-ui");
let SecurityHeadersMiddleware = class SecurityHeadersMiddleware {
    use(req, res, next) {
        setIfAbsent(res, 'Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
        setIfAbsent(res, 'X-Content-Type-Options', 'nosniff');
        setIfAbsent(res, 'X-Frame-Options', 'SAMEORIGIN');
        setIfAbsent(res, 'X-XSS-Protection', '1; mode=block');
        setIfAbsent(res, 'Referrer-Policy', 'strict-origin-when-cross-origin');
        setIfAbsent(res, 'Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=()');
        setIfAbsent(res, 'Content-Security-Policy', "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: " +
            'https://ajax.googleapis.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://gitcdn.github.io https://code.jquery.com; ' +
            "style-src 'self' 'unsafe-inline' " +
            'https://fonts.googleapis.com https://cdnjs.cloudflare.com https://gitcdn.github.io https://cdn.jsdelivr.net; ' +
            "font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; " +
            "img-src 'self' data: blob: https:; " +
            "worker-src 'self' blob:; " +
            "child-src 'self' blob:; " +
            "connect-src 'self'; " +
            "frame-src 'self' http://localhost:* https://localhost:* https://*.quickcode.net https://*.europe-west1.run.app; " +
            "frame-ancestors 'self';");
        setIfAbsent(res, 'X-Permitted-Cross-Domain-Policies', 'none');
        setIfAbsent(res, 'X-Download-Options', 'noopen');
        setIfAbsent(res, 'X-DNS-Prefetch-Control', 'off');
        if (!(0, swagger_ui_1.isSwaggerPath)(req.path || req.url || '')) {
            setIfAbsent(res, 'Cross-Origin-Embedder-Policy', 'require-corp');
            setIfAbsent(res, 'Cross-Origin-Opener-Policy', 'same-origin');
            setIfAbsent(res, 'Cross-Origin-Resource-Policy', 'same-origin');
        }
        next();
    }
};
exports.SecurityHeadersMiddleware = SecurityHeadersMiddleware;
exports.SecurityHeadersMiddleware = SecurityHeadersMiddleware = __decorate([
    (0, common_1.Injectable)()
], SecurityHeadersMiddleware);
function setIfAbsent(res, name, value) {
    if (!res.getHeader(name)) {
        res.setHeader(name, value);
    }
}
//# sourceMappingURL=security-headers.middleware.js.map