FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json        apps/web/
RUN pnpm install --frozen-lockfile=false

FROM deps AS build
COPY packages/shared packages/shared
COPY apps/web        apps/web
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @yuno/web run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=build /repo/node_modules        ./node_modules
COPY --from=build /repo/packages            ./packages
COPY --from=build /repo/apps/web/package.json ./package.json
COPY --from=build /repo/apps/web/.next      ./.next
COPY --from=build /repo/apps/web/public     ./public
COPY --from=build /repo/apps/web/next.config.mjs ./next.config.mjs

EXPOSE 3000
CMD ["./node_modules/.bin/next", "start", "-p", "3000"]
