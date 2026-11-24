import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const apiKey = this.config.get<string>('API_KEY');
    if (!apiKey) return true; // no key configured — open access

    const request = context.switchToHttp().getRequest<Request>();
    const provided =
      (request.headers['x-api-key'] as string) ??
      (request.query['api_key'] as string);

    if (provided === apiKey) return true;

    this.logger.warn(`Rejected request from ${request.ip} — invalid API key`);
    throw new UnauthorizedException('Invalid API key');
  }
}
