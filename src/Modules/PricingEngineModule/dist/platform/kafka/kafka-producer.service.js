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
var KafkaProducerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.KafkaProducerService = void 0;
const common_1 = require("@nestjs/common");
const kafkajs_1 = require("kafkajs");
let KafkaProducerService = KafkaProducerService_1 = class KafkaProducerService {
    constructor() {
        this.logger = new common_1.Logger(KafkaProducerService_1.name);
        this.producer = null;
        this.bootstrapServers = (process.env.KAFKA_BOOTSTRAP_SERVERS ||
            process.env.Kafka__BootstrapServers ||
            '').trim();
        if (!this.bootstrapServers) {
            this.logger.warn('Kafka producer: BootstrapServers is not configured');
            return;
        }
        this.logger.log(`Kafka producer initialized. BootstrapServers=${this.bootstrapServers}`);
        const kafka = new kafkajs_1.Kafka({
            clientId: process.env.MODULE_NAME || 'PricingEngineModule',
            brokers: this.bootstrapServers.split(',').map((s) => s.trim()).filter(Boolean),
            retry: { retries: 3 },
        });
        this.producer = kafka.producer();
        void this.producer.connect().catch((err) => this.logger.error('Kafka producer connect failed', err));
    }
    async produceAsync(topic, key, message) {
        if (!this.producer || !this.bootstrapServers)
            return;
        try {
            await this.producer.send({
                topic,
                messages: [{ key, value: message }],
            });
            this.logger.debug(`Kafka message delivered. Topic=${topic} Key=${key}`);
        }
        catch (err) {
            this.logger.error(`Kafka produce failed. Topic=${topic} Key=${key}`, err);
            throw err;
        }
    }
    async onModuleDestroy() {
        if (this.producer) {
            try {
                await this.producer.disconnect();
            }
            catch {
            }
        }
    }
};
exports.KafkaProducerService = KafkaProducerService;
exports.KafkaProducerService = KafkaProducerService = KafkaProducerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], KafkaProducerService);
//# sourceMappingURL=kafka-producer.service.js.map