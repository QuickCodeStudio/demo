"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HostModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const index_1 = require("./index");
const auditing_1 = require("./auditing");
const platform_1 = require("./platform");
const db_config_1 = require("./db/db-config");
let HostModule = class HostModule {
};
exports.HostModule = HostModule;
exports.HostModule = HostModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: ['.env.local', '.env'],
            }),
            typeorm_1.TypeOrmModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => {
                    if (process.env.SWAGGER_DUMP === '1') {
                        return {
                            type: 'postgres',
                            host: '127.0.0.1',
                            port: 5432,
                            username: 'swagger',
                            password: 'swagger',
                            database: 'swagger',
                            autoLoadEntities: true,
                            synchronize: false,
                            logging: false,
                            manualInitialization: true,
                        };
                    }
                    const dbType = (0, db_config_1.normalizeDbType)(config.get('DB_TYPE'));
                    const driver = (0, db_config_1.toTypeOrmDriver)(dbType);
                    const base = {
                        type: driver,
                        host: config.get('DB_HOST', 'localhost'),
                        port: Number(config.get('DB_PORT') ?? (0, db_config_1.defaultPort)(dbType)),
                        username: config.get('DB_USERNAME', (0, db_config_1.defaultUser)(dbType)),
                        password: config.get('DB_PASSWORD', (0, db_config_1.defaultPassword)(dbType)),
                        database: config.get('DB_DATABASE', 'demo'),
                        autoLoadEntities: true,
                        synchronize: config.get('DB_SYNCHRONIZE', false),
                        logging: config.get('DB_LOGGING', false),
                    };
                    if (driver === 'mssql') {
                        return {
                            ...base,
                            options: {
                                encrypt: false,
                                trustServerCertificate: true,
                            },
                        };
                    }
                    return base;
                },
            }),
            auditing_1.AuditingModule,
            platform_1.PlatformModule,
            index_1.PricingEngineModuleModule,
        ],
    })
], HostModule);
//# sourceMappingURL=host.module.js.map