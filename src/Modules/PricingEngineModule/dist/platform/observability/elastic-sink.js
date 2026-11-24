"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveElasticUri = resolveElasticUri;
exports.writeElasticLog = writeElasticLog;
const common_1 = require("@nestjs/common");
const logger = new common_1.Logger('ElasticSink');
function resolveElasticUri() {
    const raw = (process.env.ELASTIC_CONNECTION_STRING ||
        process.env.Logging__ElasticConfiguration__Uri ||
        '').trim();
    if (!raw || raw.includes('[{') || raw.includes(']'))
        return null;
    return raw.replace(/\/+$/, '');
}
function writeElasticLog(document) {
    const base = resolveElasticUri();
    if (!base)
        return;
    const apiName = (process.env.Logging__ApiName ||
        process.env.MODULE_NAME ||
        'quickcode-api')
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-');
    const environment = (process.env.NODE_ENV || 'production')
        .toLowerCase()
        .replace(/\./g, '-');
    const day = new Date().toISOString().slice(0, 10);
    const index = `${apiName}--${environment}--${day}`;
    const url = `${base}/${index}/_doc`;
    void fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            '@timestamp': new Date().toISOString(),
            ...document,
        }),
    }).catch((err) => {
        logger.warn(`Elasticsearch write failed: ${err instanceof Error ? err.message : String(err)}`);
    });
}
//# sourceMappingURL=elastic-sink.js.map