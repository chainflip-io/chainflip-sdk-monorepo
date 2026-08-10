# Localnet in Docker

Runs the SDK swap service (and the squid archive it reads from) in isolated
containers against a **separately-running `chainflip-backend` localnet**, so each
service's logs can be followed on their own. Driven by `scripts/start-localnet.mts`
(`pnpm localnet`).

## Prerequisites

- Docker (Desktop on macOS, or Engine on Linux).
- A running `chainflip-backend` localnet on the host, exposing:
  - chain node WS/HTTP `:9944`
  - broker `:10997`
  - Solana RPC `:8899`

  Containers reach these via `host.docker.internal` (mapped to `host-gateway` on Linux
  via `extra_hosts`).

Postgres, Redis, and the squid `substrate-ingest` sidecar are all provided by this
stack. The swap processor reads blocks straight out of the `squid_archive` database
(`INDEXER_DATABASE_URL`).

## Quick start

```bash
# migrate the swap DB, then start everything
pnpm localnet --apps all --migrate

# detached, then follow the swap logs
pnpm localnet --apps all -d
docker compose -f docker/localnet/docker-compose.yml logs -f swap

# list groups / services
pnpm localnet --list

# stop and remove the stack
pnpm localnet --down

# stop and wipe volumes for a clean DB (then re-run with --migrate)
pnpm localnet --down --volumes
```

Add `--build` to (re)build the shared dev image.

## Services & ports

| Service  | Port (host) | Notes                                               |
| -------- | ----------- | --------------------------------------------------- |
| swap     | 8081        | REST + WebSocket + block processor                  |
| ingest   | —           | squid `substrate-ingest` → `squid_archive`          |
| postgres | 5443        | DBs `swap`, `squid_archive` (container port `5432`) |
| redis    | 6399        | container port `6379`                               |

Postgres and Redis are published on **non-default** host ports to avoid colliding with
the backend localnet (which binds 6379) and with the web-localnet stack (5442/6389).
Containers still reach them as `postgres:5432` / `redis:6379` over the compose network.

- Postgres: `postgresql://postgres:postgres@localhost:5443/swap`
- Redis: `redis-cli -p 6399`

Override the host ports with `SDK_LOCALNET_POSTGRES_PORT` / `SDK_LOCALNET_REDIS_PORT`.

## How it works

- **One shared dev image** (`Dockerfile`) with the monorepo installed and the Prisma
  client generated for Linux. The swap container runs `dev:localnet` via `tsx watch`.
- **Env**: swap loads `packages/swap/.env.localnet`; compose `environment:` overrides
  only the host-bearing URLs (DB and archive DB → `postgres`, Redis → `redis`,
  node/broker/solana → `host.docker.internal`). dotenvx does not override pre-set env
  vars, so those overrides win while everything else comes from `.env.localnet`.
- **Hot reload**: only source trees are bind-mounted (`packages/swap/src`,
  `packages/shared/src`, and `.env.localnet`), never `node_modules`. `tsx watch` picks
  up edits and restarts the process.

### When you must rebuild

`node_modules` is baked into the image, so rebuild after any of:

- adding/removing an npm dependency,
- changing the Prisma schema,
- changing `pnpm-lock.yaml`.

```bash
pnpm localnet --apps all --build
```

Editing TypeScript under `packages/swap/src` or `packages/shared/src` does **not**
require a rebuild.

## Notes

- `squid_archive` is populated by the `ingest` container from the host node; its schema
  is owned by `substrate-ingest`. Until it catches up, the swap processor has no blocks
  to read.
- Wipe Postgres/Redis for a clean database with `pnpm localnet --down --volumes`
  (removes the named volumes so the next `--migrate` re-applies from scratch), or the raw
  equivalent `docker compose -f docker/localnet/docker-compose.yml down -v`.
