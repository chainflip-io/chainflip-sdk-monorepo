# swap-aggregations service (third-party swap aggregators, starting with SwapKit).
# Build from the repo root:
#   docker build -f packages/swap-aggregations/Dockerfile .
FROM node:26.12.1-trixie-slim AS builder

WORKDIR /app

# hadolint ignore=DL3008
RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates openssl && \
    rm -rf /var/lib/apt/lists/*

COPY . .

RUN npm install -g pnpm@10

# only the root (build tooling) and this package; skips the swap service's native dependencies
RUN pnpm install --frozen-lockfile \
    --filter @chainflip-io/chainflip-sdk-monorepo \
    --filter swap-aggregations

ARG node_env
ENV NODE_ENV=$node_env

RUN pnpm --filter swap-aggregations build

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
COPY --from=builder /app/packages/swap-aggregations /app/packages/swap-aggregations

RUN mkdir /ca-certs
RUN wget -q -O /ca-certs/rds.pem https://truststore.pki.rds.amazonaws.com/eu-central-1/eu-central-1-bundle.pem

WORKDIR /app/packages/swap-aggregations

# using ENTRYPOINT causes signals (SIGINT) to be passed onto the node process
# migrations: run the same image with `pnpm migrate:deploy`
ENTRYPOINT ["pnpm", "start"]
