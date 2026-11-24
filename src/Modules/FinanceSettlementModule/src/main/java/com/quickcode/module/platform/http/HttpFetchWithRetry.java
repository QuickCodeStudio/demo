package com.quickcode.module.platform.http;

import java.io.IOException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.function.BiPredicate;

/** Nest {@code fetch-with-retry.ts} — Polly-like outbound HTTP retries. */
public final class HttpFetchWithRetry {

    private HttpFetchWithRetry() {}

    public static <T> HttpResponse<T> sendWithRetry(
            HttpClient client, HttpRequest request, HttpResponse.BodyHandler<T> handler)
            throws IOException, InterruptedException {
        return sendWithRetry(client, request, handler, 3, 1000, null);
    }

    public static <T> HttpResponse<T> sendWithRetry(
            HttpClient client,
            HttpRequest request,
            HttpResponse.BodyHandler<T> handler,
            int retries,
            long baseDelayMs,
            BiPredicate<HttpResponse<T>, Exception> retryOn)
            throws IOException, InterruptedException {
        BiPredicate<HttpResponse<T>, Exception> predicate =
                retryOn != null ? retryOn : HttpFetchWithRetry::defaultRetry;
        Exception lastError = null;
        HttpResponse<T> lastResponse = null;

        for (int attempt = 0; attempt <= retries; attempt++) {
            try {
                HttpResponse<T> res = client.send(request, handler);
                lastResponse = res;
                if (!predicate.test(res, null) || attempt == retries) {
                    return res;
                }
            } catch (Exception ex) {
                lastError = ex;
                if (!predicate.test(null, ex) || attempt == retries) {
                    if (ex instanceof InterruptedException ie) {
                        throw ie;
                    }
                    if (ex instanceof IOException io) {
                        throw io;
                    }
                    throw new IOException(ex);
                }
            }
            Thread.sleep(baseDelayMs * (1L << attempt));
        }

        if (lastResponse != null) {
            return lastResponse;
        }
        if (lastError instanceof InterruptedException ie) {
            throw ie;
        }
        if (lastError instanceof IOException io) {
            throw io;
        }
        throw new IOException(lastError);
    }

    private static <T> boolean defaultRetry(HttpResponse<T> res, Exception err) {
        if (err != null) {
            return true;
        }
        if (res == null) {
            return true;
        }
        int status = res.statusCode();
        return status >= 500 || status == 408 || status == 429;
    }

    public static HttpClient defaultClient() {
        return HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    }
}
