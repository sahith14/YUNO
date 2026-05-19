# Multi-stage build for the API server.
# Build context is the repo root so we can pull in @yuno/db and @yuno/shared.

FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /repo

# ---- deps stage: install everything from lockfile ----
FROM base AS deps
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY tsconfig.base.json ./
COPY packages/db/package.json   packages/db/
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json      apps/api/
RUN pnpm install --frozen-lockfile=false

# ---- build stage ----
FROM deps AS build
COPY packages/db      packages/db
COPY packages/shared  packages/shared
COPY apps/api         apps/api
RUN pnpm --filter @yuno/db run generate
RUN pnpm --filter @yuno/api run build

# ---- runtime stage ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages ./packages
COPY --from=build /repo/apps/api/package.json ./package.json
COPY --from=build /repo/apps/api/dist ./dist

EXPOSE 4000
CMD ["node", "dist/index.js"]
