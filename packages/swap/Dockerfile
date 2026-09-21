FROM node:24.20.0-trixie-slim AS builder

# create root application folder
WORKDIR /app

# hadolint ignore=DL3008
RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl && \
    rm -rf /var/lib/apt/lists/*

COPY . .

# Get Rust
RUN apt-get -y update
RUN apt-get -y install curl build-essential
RUN curl https://sh.rustup.rs -sSf | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

RUN npm install -g pnpm@10

RUN pnpm install --frozen-lockfile

ARG node_env
ENV NODE_ENV=$node_env

RUN pnpm --filter swap build

FROM node:24.20.0-trixie-slim

WORKDIR /app

# hadolint ignore=DL3008
RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl && \
    rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm@10

COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/pnpm-workspace.yaml /app/pnpm-workspace.yaml
COPY --from=builder /app/packages/swap /app/packages/swap
COPY --from=builder /app/packages/swap/.env.* /app

RUN apt update && apt install -y wget
RUN mkdir /ca-certs
RUN wget -q -O /ca-certs/rds.pem https://truststore.pki.rds.amazonaws.com/eu-central-1/eu-central-1-bundle.pem

WORKDIR /app/packages/swap

# using ENTRYPOINT causes signals (SIGINT) to be passed onto the node process
ENTRYPOINT ["pnpm", "--filter", "swap", "start"]
