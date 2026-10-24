# NexLearn backend — Bun runtime in Docker (used by Render blueprint)
FROM oven/bun:1-slim

WORKDIR /app

# Install dependencies first for layer caching
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY tsconfig.json ./
COPY src ./src

ENV NODE_ENV=production
EXPOSE 4000

USER bun
CMD ["bun", "src/index.ts"]
