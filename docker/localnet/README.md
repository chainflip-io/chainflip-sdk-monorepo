# Localnet in Docker

Runs the SDK swap service (and the ingest gateway it depends on) in isolated
containers against a **separately-running `chainflip-backend` localnet**, so each
service's logs can be followed on their own. This is the Docker counterpart to
`scripts/start-localnet.mts` (`pnpm localnet`).

## Prerequisites

- Docker (Desktop on macOS, or Engine on Linux).
- A running `chainflip-backend` localnet on the host, exposing:
  - chain node WS/HTTP `:9944`
  - broker `:10997`
  - Solana RPC `:8899`

  Containers reach these via `host.docker.internal` (mapped to `host-gateway` on Linux
  via `extra_hosts`).

Postgres, Redis, the squid `substrate-ingest` sidecar, and the `indexer-gateway`
(postgraphile, swap's `INGEST_GATEWAY_URL`) are all provided by this stack.

## Quick start

```bash
# migrate the swap DB, then start everything
pnpm localnet:docker --apps all --migrate

# detached, then follow the swap logs
pnpm localnet:docker --apps all -d
docker compose -f docker/localnet/docker-compose.yml logs -f swap

# list groups / services
pnpm localnet:docker --list

# stop and remove the stack
pnpm localnet:docker --down
```

Add `--build` to (re)build the shared dev image.

## Services & ports

| Service         | Port (host) | Notes                                                                     |
| --------------- | ----------- | ------------------------------------------------------------------------- |
| swap            | 8081        | REST + WebSocket + block processor                                        |
| indexer-gateway | —           | postgraphile over `squid_archive`; internal only (`indexer-gateway:8000`) |
| ingest          | —           | squid `substrate-ingest` → `squid_archive`                                |
| postgres        | —           | DBs `swap`, `squid_archive`; internal only (`postgres:5432`)              |
| redis           | —           | internal only (`redis:6379`)                                              |

Postgres, Redis, and the gateway are **not published to the host** — they'd collide with
the backend localnet / the web-services localnet (which also runs an indexer-gateway on
`:8000`). Containers reach each other by compose network name. For host DB access:
`docker exec chainflip-sdk-localnet-postgres-1 psql -U postgres`.

## How it works

- **One shared dev image** (`Dockerfile`) with the monorepo installed and the Prisma
  client generated for Linux. The swap container runs `dev:localnet` via `tsx watch`;
  the indexer-gateway container runs postgraphile (command overridden to point at the
  compose `postgres`).
- **Env**: swap loads `packages/swap/.env.localnet`; compose `environment:` overrides
  only the host-bearing URLs (DB → `postgres`, Redis → `redis`, ingest gateway →
  `indexer-gateway`, node/broker/solana → `host.docker.internal`). dotenvx does not
  override pre-set env vars, so those overrides win while everything else comes from
  `.env.localnet`.
- **Hot reload**: only source trees are bind-mounted (`packages/swap/src`,
  `packages/shared/src`, and `.env.localnet`), never `node_modules`. `tsx watch` picks
  up edits and restarts the process.

### When you must rebuild

`node_modules` is baked into the image, so rebuild after any of:

- adding/removing an npm dependency,
- changing the Prisma schema,
- changing `pnpm-lock.yaml`.

```bash
pnpm localnet:docker --apps all --build
```

Editing TypeScript under `packages/swap/src` or `packages/shared/src` does **not**
require a rebuild.

## Notes

- `squid_archive` is populated by the `ingest` container from the host node; its schema
  is owned by `substrate-ingest`. Until it catches up, the gateway serves an empty
  schema and the swap processor has no blocks to read.
- Wipe Postgres (re-run the DB init) with:
  `docker compose -f docker/localnet/docker-compose.yml down -v`.
