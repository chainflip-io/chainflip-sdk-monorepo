FROM node:22.3.0-bullseye-slim as builder

# create root application folder
WORKDIR /app

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

FROM node:22.3.0-bullseye-slim

WORKDIR /app

RUN npm install -g pnpm@10

COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/pnpm-workspace.yaml /app/pnpm-workspace.yaml
COPY --from=builder /app/packages/swap /app/packages/swap

WORKDIR /app/packages/swap

CMD ["pnpm", "--filter", "swap", "start"]
