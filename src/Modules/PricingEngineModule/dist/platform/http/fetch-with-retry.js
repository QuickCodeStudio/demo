"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchWithRetry = fetchWithRetry;
async function fetchWithRetry(input, init, options) {
    const retries = options?.retries ?? 3;
    const baseDelayMs = options?.baseDelayMs ?? 1000;
    const retryOn = options?.retryOn ??
        ((res, err) => {
            if (err)
                return true;
            if (!res)
                return true;
            return res.status >= 500 || res.status === 408 || res.status === 429;
        });
    let lastError;
    let lastResponse = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const res = await fetch(input, init);
            lastResponse = res;
            if (!retryOn(res, null) || attempt === retries)
                return res;
        }
        catch (err) {
            lastError = err;
            if (!retryOn(null, err) || attempt === retries)
                throw err;
        }
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
    }
    if (lastResponse)
        return lastResponse;
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
//# sourceMappingURL=fetch-with-retry.js.map