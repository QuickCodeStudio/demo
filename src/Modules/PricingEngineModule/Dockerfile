FROM node:22-alpine AS builder
WORKDIR /app

ARG MODULE_NAME=PricingEngineModule

COPY package.json package-lock.json* ./
COPY src/libs/common/package.json src/libs/common/
COPY src/Modules/${MODULE_NAME}/package.json src/Modules/${MODULE_NAME}/

RUN npm ci --workspace=@demo/common --workspace=@demo/PricingEngineModule

COPY tsconfig.json ./
COPY src/libs/common/ src/libs/common/
COPY src/Modules/${MODULE_NAME}/ src/Modules/${MODULE_NAME}/

RUN npm -w @demo/common run build
RUN npm -w @demo/PricingEngineModule run build
# npm workspaces hoist dependencies. Keep the folder so the production copy always has a source.
RUN mkdir -p src/Modules/${MODULE_NAME}/node_modules

FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=80
ENV RUN_MIGRATION=yes

ARG MODULE_NAME=PricingEngineModule
ENV ENDPOINT_WORKFLOWS_PATH=src/Modules/${MODULE_NAME}/workflows/generated-endpoint-workflows.json

COPY --from=builder /app/package.json /app/package-lock.json* ./
COPY --from=builder /app/src/libs/common/package.json src/libs/common/
COPY --from=builder /app/src/Modules/${MODULE_NAME}/package.json src/Modules/${MODULE_NAME}/
# Reuse builder install graph — a second `npm ci --omit=dev` can nest mysql2 without
# transitive deps (e.g. sql-escaper) resolving correctly under npm workspaces.
COPY --from=builder /app/node_modules ./node_modules
# Workspace packages may nest runtime deps (e.g. mysql2) under the module folder.
# Do not `npm prune` here — it can drop transitive deps of nested installs (sql-escaper).
COPY --from=builder /app/src/Modules/${MODULE_NAME}/node_modules src/Modules/${MODULE_NAME}/node_modules

COPY --from=builder /app/src/libs/common/dist/ src/libs/common/dist/
COPY --from=builder /app/src/Modules/${MODULE_NAME}/dist/ src/Modules/${MODULE_NAME}/dist/
# QuickCode SQL + InitialData (not compiled) — same role as C# Persistence/Migrations + Persistence/Sql
COPY --from=builder /app/src/Modules/${MODULE_NAME}/migrations/ src/Modules/${MODULE_NAME}/migrations/
COPY --from=builder /app/src/Modules/${MODULE_NAME}/sql/ src/Modules/${MODULE_NAME}/sql/
COPY --from=builder /app/src/Modules/${MODULE_NAME}/workflows/ src/Modules/${MODULE_NAME}/workflows/

EXPOSE 80
CMD ["node", "src/Modules/PricingEngineModule/dist/main.js"]
