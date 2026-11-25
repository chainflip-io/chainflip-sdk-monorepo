# Integrators service (third-party swap providers, starting with SwapKit). Build from the repo root:
#   docker build -f packages/sdk/integrators.Dockerfile .
FROM node:26.12.1-trixie-slim AS builder

WORKDIR /app

# hadolint ignore=DL3008
RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates openssl && \
    rm -rf /var/lib/apt/lists/*

COPY . .

RUN npm install -g pnpm@10

# only the root (build tooling) and the sdk package; skips the swap service's native dependencies
RUN pnpm install --frozen-lockfile \
    --filter @chainflip-io/chainflip-sdk-monorepo \
    --filter @chainflip/sdk

ARG node_env
ENV NODE_ENV=$node_env

RUN pnpm --filter @chainflip/sdk integrators:build

FROM node:26.12.1-trixie-slim

WORKDIR /app

# hadolint ignore=DL3008
RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates openssl wget && \
    rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm@10

COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/pnpm-workspace.yaml /app/pnpm-workspace.yaml
COPY --from=builder /app/packages/sdk/package.json /app/packages/sdk/package.json
COPY --from=builder /app/packages/sdk/node_modules /app/packages/sdk/node_modules
COPY --from=builder /app/packages/sdk/dist-integrators /app/packages/sdk/dist-integrators
# needed for `pnpm integrators:migrate:deploy`
COPY --from=builder /app/packages/sdk/prisma /app/packages/sdk/prisma
COPY --from=builder /app/packages/sdk/prisma.config.ts /app/packages/sdk/prisma.config.ts

RUN mkdir /ca-certs
RUN wget -q -O /ca-certs/rds.pem https://truststore.pki.rds.amazonaws.com/eu-central-1/eu-central-1-bundle.pem

WORKDIR /app/packages/sdk

# using ENTRYPOINT causes signals (SIGINT) to be passed onto the node process
ENTRYPOINT ["pnpm", "integrators:start"]
