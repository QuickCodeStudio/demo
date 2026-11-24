import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { KafkaProducerService } from './kafka-producer.service';
import { OutboxStore } from './in-memory-outbox-store';
export declare class OutboxDispatcherService implements OnModuleInit, OnModuleDestroy {
    private readonly producer;
    private readonly logger;
    private readonly outbox;
    private timer;
    private draining;
    constructor(producer: KafkaProducerService, outbox?: OutboxStore);
    onModuleInit(): void;
    onModuleDestroy(): void;
    start(): void;
    stop(): void;
    drainOnce(): Promise<number>;
}
export declare function resolvePollSeconds(): number;
