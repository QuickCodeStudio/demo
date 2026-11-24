import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PricingEngineModuleModule } from './index';
import { AuditingModule } from './auditing';
import { PlatformModule } from './platform';
import {
  defaultPassword,
  defaultPort,
  defaultUser,
  normalizeDbType,
  toTypeOrmDriver,
} from './db/db-config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        if (process.env.SWAGGER_DUMP === '1') {
          return {
            type: 'postgres' as const,
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

        const dbType = normalizeDbType(config.get<string>('DB_TYPE'));
        const driver = toTypeOrmDriver(dbType);
        const base = {
          type: driver,
          host: config.get<string>('DB_HOST', 'localhost'),
          port: Number(config.get<string>('DB_PORT') ?? defaultPort(dbType)),
          username: config.get<string>('DB_USERNAME', defaultUser(dbType)),
          password: config.get<string>('DB_PASSWORD', defaultPassword(dbType)),
          database: config.get<string>('DB_DATABASE', 'demo'),
          autoLoadEntities: true,
          synchronize: config.get<boolean>('DB_SYNCHRONIZE', false),
          logging: config.get<boolean>('DB_LOGGING', false),
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
    AuditingModule,
    PlatformModule,
    PricingEngineModuleModule,
  ],
})
export class HostModule {}
