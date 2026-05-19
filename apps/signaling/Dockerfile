FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY tsconfig.base.json ./
COPY packages/shared/package.json    packages/shared/
COPY apps/signaling/package.json     apps/signaling/
RUN pnpm install --frozen-lockfile=false

FROM deps AS build
COPY packages/shared  packages/shared
COPY apps/signaling   apps/signaling
RUN pnpm --filter @yuno/signaling run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages ./packages
COPY --from=build /repo/apps/signaling/package.json ./package.json
COPY --from=build /repo/apps/signaling/dist ./dist

EXPOSE 4001
CMD ["node", "dist/index.js"]
