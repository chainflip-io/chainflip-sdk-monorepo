# Shared dev image for the SDK localnet stack.
#
# Both the swap service and the indexer-gateway run from this single image;
# docker-compose supplies a per-service `command`. There is no compile step — the
# swap service runs via `tsx watch` (its `dev:localnet` script), matching
# scripts/start-localnet.mts.
#
# node_modules are installed *inside* the image (Linux binaries). The compose file
# bind-mounts only source trees for hot reload, never node_modules.
#
# NOTE: unlike the legacy packages/swap/Dockerfile, no Rust toolchain is installed —
# the old amm-addon (napi/Rust) package is no longer part of the workspace, and none
# of swap's current dependencies need native compilation.
FROM node:24.13.0-bullseye-slim

WORKDIR /app

RUN npm install -g pnpm@10

# Build context is the repo root (see docker-compose `build.context: ../..`).
# The root .dockerignore keeps host node_modules / dist / logs out of the context.
COPY . .

# `pnpm install` runs swap's `postinstall: prisma generate`, generating the Prisma
# client with Linux engine binaries.
RUN pnpm install --frozen-lockfile

# No ENTRYPOINT/CMD — each compose service defines its own `command`.
