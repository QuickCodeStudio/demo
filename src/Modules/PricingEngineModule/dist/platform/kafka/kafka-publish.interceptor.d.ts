import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { KafkaEventCatalogService } from './kafka-event-catalog.service';
import { OutboxStore } from './in-memory-outbox-store';
export declare class KafkaPublishInterceptor implements NestInterceptor {
    private readonly catalog;
    private readonly logger;
    private readonly outbox;
    constructor(catalog: KafkaEventCatalogService, outbox?: OutboxStore);
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown>;
    private enqueueSafe;
}
export declare function buildStableKey(method: string, path: string, correlationId: string, body: unknown): string;
