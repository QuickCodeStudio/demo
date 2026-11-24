"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var OutboxDispatcherService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutboxDispatcherService = void 0;
exports.resolvePollSeconds = resolvePollSeconds;
const common_1 = require("@nestjs/common");
const kafka_producer_service_1 = require("./kafka-producer.service");
const in_memory_outbox_store_1 = require("./in-memory-outbox-store");
const BATCH_SIZE = 20;
let OutboxDispatcherService = OutboxDispatcherService_1 = class OutboxDispatcherService {
    constructor(producer, outbox) {
        this.producer = producer;
        this.logger = new common_1.Logger(OutboxDispatcherService_1.name);
        this.timer = null;
        this.draining = false;
        this.outbox = outbox ?? in_memory_outbox_store_1.sharedInMemoryOutboxStore;
    }
    onModuleInit() {
        this.start();
    }
    onModuleDestroy() {
        this.stop();
    }
    start() {
        if (this.timer)
            return;
        const intervalMs = resolvePollSeconds() * 1000;
        this.timer = setInterval(() => {
            void this.drainOnce();
        }, intervalMs);
        this.timer.unref?.();
        this.logger.log(`Outbox dispatcher started. PollSeconds=${intervalMs / 1000}`);
    }
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    async drainOnce() {
        if (this.draining)
            return 0;
        this.draining = true;
        let sent = 0;
        try {
            const batch = await this.outbox.dequeuePending(BATCH_SIZE);
            for (const message of batch) {
                try {
                    await this.producer.produceAsync(message.topic, message.key, message.payload);
                    await this.outbox.markSent(message.id);
                    sent++;
                    this.logger.log(`Outbox sent. Id=${message.id} Topic=${message.topic} CorrelationId=${message.correlationId ?? ''}`);
                }
                catch (err) {
                    const error = err instanceof Error ? err.message : String(err);
                    await this.outbox.markFailed(message.id, error);
                    this.logger.error(`Outbox produce failed. Id=${message.id} Topic=${message.topic}: ${error}`);
                }
            }
        }
        catch (err) {
            this.logger.error(`Outbox dispatcher loop error: ${err instanceof Error ? err.message : String(err)}`);
        }
        finally {
            this.draining = false;
        }
        return sent;
    }
};
exports.OutboxDispatcherService = OutboxDispatcherService;
exports.OutboxDispatcherService = OutboxDispatcherService = OutboxDispatcherService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Optional)()),
    __param(1, (0, common_1.Inject)(in_memory_outbox_store_1.OUTBOX_STORE)),
    __metadata("design:paramtypes", [kafka_producer_service_1.KafkaProducerService, Object])
], OutboxDispatcherService);
function resolvePollSeconds() {
    const raw = process.env.KAFKA_OUTBOX_POLL_SECONDS ?? process.env.Kafka__OutboxPollSeconds;
    const parsed = raw === undefined || raw.trim() === '' ? NaN : Number(raw);
    if (!Number.isFinite(parsed))
        return 2;
    return Math.max(1, parsed);
}
//# sourceMappingURL=outbox-dispatcher.service.js.map