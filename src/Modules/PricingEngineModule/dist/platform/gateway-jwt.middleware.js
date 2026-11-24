"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var GatewayJwtMiddleware_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GatewayJwtMiddleware = void 0;
exports.loadPublicKey = loadPublicKey;
exports.loadPrivateKey = loadPrivateKey;
exports.createGatewayServiceToken = createGatewayServiceToken;
const crypto_1 = require("crypto");
const common_1 = require("@nestjs/common");
const jwt = __importStar(require("jsonwebtoken"));
const security_audit_middleware_1 = require("../auditing/security-audit.middleware");
const DEFAULT_ISSUER = 'quickcode-gateway';
let GatewayJwtMiddleware = GatewayJwtMiddleware_1 = class GatewayJwtMiddleware {
    constructor() {
        this.logger = new common_1.Logger(GatewayJwtMiddleware_1.name);
        this.issuer =
            process.env.GATEWAY_JWT_ISSUER ||
                process.env.GatewayServiceTokenSettings__Issuer ||
                DEFAULT_ISSUER;
        this.audience =
            process.env.MODULE_NAME ||
                process.env.AppSettings__ModuleName ||
                'PricingEngineModule';
        this.publicKey = loadPublicKey();
        if (!this.publicKey) {
            this.logger.warn('GATEWAY_JWT_PUBLIC_KEY not set — Bearer tokens will not be validated');
        }
    }
    use(req, res, next) {
        const path = req.path || req.url || '';
        if ((0, security_audit_middleware_1.isHealthPath)(path) || path.startsWith('/swagger')) {
            next();
            return;
        }
        const header = req.headers.authorization;
        if (!header?.startsWith('Bearer ') || !this.publicKey) {
            next();
            return;
        }
        const token = header.slice('Bearer '.length).trim();
        try {
            const payload = jwt.verify(token, this.publicKey, {
                algorithms: ['RS256'],
                issuer: this.issuer,
                audience: this.audience,
                clockTolerance: 2,
            });
            req.user = {
                id: payload.sub ?? payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'],
                sub: payload.sub,
                email: payload.email,
                permissionGroup: payload['PermissionGroupName'],
                claims: payload,
            };
        }
        catch (err) {
            this.logger.warn(`Gateway JWT validation failed: ${err instanceof Error ? err.message : String(err)}`);
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        next();
    }
};
exports.GatewayJwtMiddleware = GatewayJwtMiddleware;
exports.GatewayJwtMiddleware = GatewayJwtMiddleware = GatewayJwtMiddleware_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], GatewayJwtMiddleware);
function loadPublicKey() {
    const b64 = process.env.GATEWAY_JWT_PUBLIC_KEY ||
        process.env.QUICKCODE_GATEWAY_JWT_PUBLIC_KEY;
    if (!b64?.trim())
        return null;
    try {
        return (0, crypto_1.createPublicKey)({
            key: Buffer.from(b64.trim(), 'base64'),
            format: 'der',
            type: 'spki',
        });
    }
    catch (err) {
        console.warn('Failed to parse GATEWAY_JWT_PUBLIC_KEY', err);
        return null;
    }
}
function loadPrivateKey() {
    const b64 = process.env.GATEWAY_JWT_PRIVATE_KEY ||
        process.env.QUICKCODE_GATEWAY_JWT_PRIVATE_KEY;
    if (!b64?.trim())
        return null;
    try {
        return (0, crypto_1.createPrivateKey)({
            key: Buffer.from(b64.trim(), 'base64'),
            format: 'der',
            type: 'pkcs8',
        });
    }
    catch {
        return null;
    }
}
function createGatewayServiceToken(targetModuleName) {
    const key = loadPrivateKey();
    if (!key)
        return null;
    const issuer = process.env.GATEWAY_JWT_ISSUER ||
        process.env.GatewayServiceTokenSettings__Issuer ||
        DEFAULT_ISSUER;
    const expiresIn = Number(process.env.GATEWAY_JWT_EXPIRATION_SECONDS ?? 60);
    return jwt.sign({
        PermissionGroupName: 'InternalService',
    }, key, {
        algorithm: 'RS256',
        issuer,
        audience: targetModuleName,
        subject: 'gateway',
        expiresIn,
        jwtid: (0, crypto_1.randomUUID)(),
    });
}
//# sourceMappingURL=gateway-jwt.middleware.js.map