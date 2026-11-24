# Mixed-site compose: build context is the site root (`..` from src/).
# Gradle 9.1+ can run the daemon on JDK 25 (8.14 could not). Build + runtime both use 25.
FROM eclipse-temurin:25-jdk-jammy AS builder
WORKDIR /app

ARG MODULE_NAME=FinanceSettlementModule

COPY src/Modules/${MODULE_NAME}/gradlew src/Modules/${MODULE_NAME}/gradlew.bat src/Modules/${MODULE_NAME}/settings.gradle.kts src/Modules/${MODULE_NAME}/build.gradle.kts src/Modules/${MODULE_NAME}/gradle.properties src/Modules/${MODULE_NAME}/
COPY src/Modules/${MODULE_NAME}/gradle src/Modules/${MODULE_NAME}/gradle
COPY src/Modules/${MODULE_NAME}/src src/Modules/${MODULE_NAME}/src
COPY src/Modules/${MODULE_NAME}/migrations src/Modules/${MODULE_NAME}/migrations
COPY src/Modules/${MODULE_NAME}/sql src/Modules/${MODULE_NAME}/sql
COPY src/Modules/${MODULE_NAME}/workflows src/Modules/${MODULE_NAME}/workflows

WORKDIR /app/src/Modules/${MODULE_NAME}
# Persist Gradle distro + caches across builds.
RUN --mount=type=cache,target=/root/.gradle \
    chmod +x gradlew && ./gradlew bootJar --no-daemon -q

FROM eclipse-temurin:25-jre-jammy AS production
WORKDIR /app

ENV PORT=80
ENV RUN_MIGRATION=yes

ARG MODULE_NAME=FinanceSettlementModule
ENV ENDPOINT_WORKFLOWS_PATH=/app/workflows/generated-endpoint-workflows.json

COPY --from=builder /app/src/Modules/${MODULE_NAME}/build/libs/quickcode-module.jar /app/app.jar
COPY --from=builder /app/src/Modules/${MODULE_NAME}/migrations /app/migrations
COPY --from=builder /app/src/Modules/${MODULE_NAME}/sql /app/sql
COPY --from=builder /app/src/Modules/${MODULE_NAME}/workflows /app/workflows

EXPOSE 80
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
