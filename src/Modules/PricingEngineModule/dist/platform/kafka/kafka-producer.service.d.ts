import { OnModuleDestroy } from '@nestjs/common';
export declare class KafkaProducerService implements OnModuleDestroy {
    private readonly logger;
    private readonly bootstrapServers;
    private producer;
    constructor();
    produceAsync(topic: string, key: string, message: string): Promise<void>;
    onModuleDestroy(): Promise<void>;
}
