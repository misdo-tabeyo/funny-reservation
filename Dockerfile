# ---- build ----
FROM node:20-bookworm-slim AS build
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY src ./src

RUN pnpm build

# ---- run ----
FROM node:20-bookworm-slim
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --prod --frozen-lockfile

COPY --from=build /app/dist ./dist

ENV NODE_ENV=production
CMD ["pnpm", "start"]
