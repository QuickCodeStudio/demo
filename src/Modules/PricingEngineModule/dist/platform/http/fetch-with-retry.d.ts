export declare function fetchWithRetry(input: string | URL, init?: RequestInit, options?: {
    retries?: number;
    baseDelayMs?: number;
    retryOn?: (res: Response | null, err: unknown) => boolean;
}): Promise<Response>;
