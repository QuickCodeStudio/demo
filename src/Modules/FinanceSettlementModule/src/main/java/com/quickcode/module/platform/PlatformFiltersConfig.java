package com.quickcode.module.platform;

import com.quickcode.module.auditing.AuditLogWriter;
import com.quickcode.module.auditing.SecurityAuditFilter;
import com.quickcode.module.platform.http.GatewayServiceTokenGenerator;
import com.quickcode.module.platform.kafka.InMemoryOutboxStore;
import com.quickcode.module.platform.kafka.KafkaEventCatalogService;
import com.quickcode.module.platform.kafka.KafkaProducerService;
import com.quickcode.module.platform.kafka.KafkaPublishFilter;
import com.quickcode.module.platform.observability.HttpMetricsFilter;
import com.quickcode.module.platform.workflows.EndpointWorkflowExecutor;
import com.quickcode.module.platform.workflows.EndpointWorkflowFilter;
import com.quickcode.module.platform.workflows.EndpointWorkflowRegistry;
import com.quickcode.module.platform.workflows.InMemoryIdempotencyStore;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.web.filter.CorsFilter;
import org.springframework.web.filter.ForwardedHeaderFilter;

@Configuration
public class PlatformFiltersConfig {

    @Bean
    FilterRegistrationBean<ForwardedHeaderFilter> forwardedHeaderFilterRegistration() {
        FilterRegistrationBean<ForwardedHeaderFilter> bean = new FilterRegistrationBean<>(new ForwardedHeaderFilter());
        bean.setOrder(Ordered.HIGHEST_PRECEDENCE);
        bean.addUrlPatterns("/*");
        return bean;
    }

    @Bean
    FilterRegistrationBean<SwaggerGatewayRewriteFilter> swaggerGatewayRewriteFilterRegistration() {
        FilterRegistrationBean<SwaggerGatewayRewriteFilter> bean =
                new FilterRegistrationBean<>(new SwaggerGatewayRewriteFilter());
        bean.setOrder(Ordered.HIGHEST_PRECEDENCE + 2);
        bean.addUrlPatterns("/*");
        return bean;
    }

    @Bean
    FilterRegistrationBean<CorsFilter> corsFilterRegistration(CorsFilter corsFilter) {
        FilterRegistrationBean<CorsFilter> bean = new FilterRegistrationBean<>(corsFilter);
        bean.setOrder(Ordered.HIGHEST_PRECEDENCE + 3);
        bean.addUrlPatterns("/*");
        return bean;
    }

    @Bean
    FilterRegistrationBean<SecurityHeadersFilter> securityHeadersFilterRegistration() {
        FilterRegistrationBean<SecurityHeadersFilter> bean = new FilterRegistrationBean<>(new SecurityHeadersFilter());
        bean.setOrder(Ordered.HIGHEST_PRECEDENCE + 5);
        bean.addUrlPatterns("/*");
        return bean;
    }

    @Bean
    FilterRegistrationBean<RateLimitFilter> rateLimitFilterRegistration() {
        FilterRegistrationBean<RateLimitFilter> bean = new FilterRegistrationBean<>(new RateLimitFilter());
        bean.setOrder(Ordered.HIGHEST_PRECEDENCE + 10);
        bean.addUrlPatterns("/*");
        return bean;
    }

    @Bean
    FilterRegistrationBean<ApiLogFilter> apiLogFilterRegistration() {
        FilterRegistrationBean<ApiLogFilter> bean = new FilterRegistrationBean<>(new ApiLogFilter());
        bean.setOrder(Ordered.HIGHEST_PRECEDENCE + 15);
        bean.addUrlPatterns("/*");
        return bean;
    }

    @Bean
    FilterRegistrationBean<HttpMetricsFilter> httpMetricsFilterRegistration(MeterRegistry meterRegistry) {
        FilterRegistrationBean<HttpMetricsFilter> bean =
                new FilterRegistrationBean<>(new HttpMetricsFilter(meterRegistry));
        bean.setOrder(Ordered.HIGHEST_PRECEDENCE + 16);
        bean.addUrlPatterns("/*");
        return bean;
    }

    @Bean
    FilterRegistrationBean<GatewayJwtFilter> gatewayJwtFilterRegistration() {
        FilterRegistrationBean<GatewayJwtFilter> bean = new FilterRegistrationBean<>(new GatewayJwtFilter());
        bean.setOrder(Ordered.HIGHEST_PRECEDENCE + 20);
        bean.addUrlPatterns("/*");
        return bean;
    }

    @Bean
    InMemoryIdempotencyStore inMemoryIdempotencyStore() {
        return new InMemoryIdempotencyStore();
    }

    /** Right after JWT validation (C# {@code UseModuleEndpointWorkflows} runs after auth). */
    @Bean
    FilterRegistrationBean<EndpointWorkflowFilter> endpointWorkflowFilterRegistration(
            GatewayServiceTokenGenerator tokenGenerator, InMemoryIdempotencyStore idempotencyStore) {
        FilterRegistrationBean<EndpointWorkflowFilter> bean =
                new FilterRegistrationBean<>(
                        new EndpointWorkflowFilter(
                                EndpointWorkflowRegistry.fromEnvironment(),
                                new EndpointWorkflowExecutor(tokenGenerator::mint),
                                idempotencyStore));
        bean.setOrder(Ordered.HIGHEST_PRECEDENCE + 21);
        bean.addUrlPatterns("/*");
        return bean;
    }

    @Bean
    FilterRegistrationBean<SecurityAuditFilter> securityAuditFilterRegistration(AuditLogWriter auditLogWriter) {
        FilterRegistrationBean<SecurityAuditFilter> bean =
                new FilterRegistrationBean<>(new SecurityAuditFilter(auditLogWriter));
        bean.setOrder(Ordered.LOWEST_PRECEDENCE - 20);
        bean.addUrlPatterns("/*");
        return bean;
    }

    @Bean
    FilterRegistrationBean<KafkaPublishFilter> kafkaPublishFilterRegistration(
            KafkaEventCatalogService catalog, KafkaProducerService producer, InMemoryOutboxStore outboxStore) {
        FilterRegistrationBean<KafkaPublishFilter> bean =
                new FilterRegistrationBean<>(new KafkaPublishFilter(catalog, producer, outboxStore));
        bean.setOrder(Ordered.LOWEST_PRECEDENCE - 10);
        bean.addUrlPatterns("/*");
        return bean;
    }
}
