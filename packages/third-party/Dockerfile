# third-party service (third-party swap aggregators, starting with SwapKit).
# Build from the repo root:
#   docker build -f packages/third-party/Dockerfile .
FROM node:26.12.1-trixie-slim AS builder

WORKDIR /app

# hadolint ignore=DL3008
RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates openssl wget && \
    rm -rf /var/lib/apt/lists/*

RUN wget -q -O /rds.pem https://truststore.pki.rds.amazonaws.com/eu-central-1/eu-central-1-bundle.pem

RUN npm install -g pnpm@12.21.0

COPY . .

# only the root (build tooling) and this package; skips the swap service's native dependencies
RUN pnpm install --frozen-lockfile \
    --filter @chainflip-io/chainflip-sdk-monorepo \
    --filter third-party

RUN pnpm --filter third-party build

# reinstall without devDependencies for the runtime image
# --ignore-scripts: the root postinstall needs devDependencies, so generate the client explicitly
RUN find . -name node_modules -type d -prune -exec rm -rf {} + && \
    pnpm install --frozen-lockfile --prod --ignore-scripts --filter third-party && \
    pnpm --filter third-party generate:models

FROM node:26.12.1-trixie-slim

# openssl is needed by the prisma schema engine (migrations)
# hadolint ignore=DL3008
RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates openssl && \
    rm -rf /var/lib/apt/lists/*

# no package managers at runtime
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

# CHECKPOINT_DISABLE: stops the prisma CLI phoning home
ENV NODE_ENV=production \
    CHECKPOINT_DISABLE=1 \
    PATH=/app/packages/third-party/node_modules/.bin:$PATH

WORKDIR /app/packages/third-party

# everything stays root-owned, so the runtime user cannot modify it
COPY --from=builder /rds.pem /ca-certs/rds.pem
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/packages/third-party/node_modules ./node_modules
COPY --from=builder /app/packages/third-party/dist ./dist
COPY --from=builder /app/packages/third-party/prisma ./prisma
COPY --from=builder /app/packages/third-party/package.json /app/packages/third-party/prisma.config.ts ./

# numeric so that k8s `runAsNonRoot` can verify it
USER 1000:1000

EXPOSE 8080

# node runs as PID 1 and handles SIGINT/SIGTERM itself (src/utils/exit.ts)
# migrations: override the entrypoint, e.g. `docker run --entrypoint prisma <image> migrate deploy`
# (in k8s: `command: ["prisma", "migrate", "deploy"]`)
ENTRYPOINT ["node", "dist/packages/third-party/src/index.js"]
