# Running the SDK monorepo against a localnet

This guide explains how to run the **sdk-monorepo** swap service against a locally running
`chainflip-backend` localnet, using the `pnpm localnet` orchestrator added in
[WEB-3578](https://linear.app/chainflip/issue/WEB-3578).

> Part of the full local stack: **chainflip-backend → [web-services](https://github.com/chainflip-io/chainflip-web-services/blob/main/LOCALNET.md) → sdk-monorepo → [frontend-monorepo](https://github.com/chainflip-io/chainflip-frontend-monorepo/blob/main/LOCALNET.md)**.

## Prerequisites

1. **A running `chainflip-backend` localnet.** From your `chainflip-backend` checkout run
   `./localnet/manage.sh` and pick `build-localnet`. It provides everything the swap service
   connects to:

   | Dependency                   | Endpoint                                                         |
   | ---------------------------- | ---------------------------------------------------------------- |
   | State chain RPC              | `ws://127.0.0.1:9944`, `http://127.0.0.1:9944`                   |
   | Broker                       | `http://127.0.0.1:10997`                                         |
   | Indexer DB (`squid_archive`) | `127.0.0.1:5432` — populated by the backend's `substrate-ingest` |
   | Postgres                     | `127.0.0.1:5432` (user/pass `postgres`/`postgres`)               |
   | Redis                        | `127.0.0.1:6379`                                                 |
   | Solana                       | `http://localhost:8899`                                          |

   The network name is `backspin`.

2. **Dependencies installed:** `pnpm install`.
3. **Prisma models generated:** `pnpm -r exec prisma generate`.
4. **The swap DB migrated** (first run, or after schema changes) — see [Migrations](#migrations).

## Quick start

```bash
# Migrate the swap DB, then start the indexer-gateway + swap service against the localnet
pnpm localnet --apps all --migrate

# Or start the gateway + swap service (assumes the DB is already migrated)
pnpm localnet --apps swap
```

This brings up the SDK's own `indexer-gateway` on **`:8000`** and the swap HTTP/processor service
on **`:8081`**.

## What can I start?

`pnpm localnet` takes **groups** or individual **service** names. List them any time:

```bash
pnpm localnet --list
```

| Group / service   | Expands to             | Port   |
| ----------------- | ---------------------- | ------ |
| `all`             | indexer-gateway + swap | —      |
| `swap`            | indexer-gateway + swap | —      |
| `indexer-gateway` | indexer-gateway        | `8000` |
| `sdk-swap`        | swap (service only)    | `8081` |

Friendly aliases: `sdk-swap` → `swap` (service), `indexer-gw` → `indexer-gateway`.

> `swap` is a **group** (gateway + swap). To start only the swap service (e.g. the gateway is
> already running), use the `sdk-swap` alias.

## Common recipes

```bash
pnpm localnet --apps swap                # start the SDK swap service (:8081)
pnpm localnet --apps all --migrate       # migrate the swap DB, then start everything
pnpm localnet --list                     # show available groups/services and exit
```

Press `Ctrl-C` to shut down (child processes receive `SIGINT`, then `SIGKILL` after 5s).

## Migrations

```bash
pnpm migrate:deploy:localnet          # migrate the swap DB
```

or pass `--migrate` to run this automatically before starting. Under the hood the swap package
exposes `migrate:deploy:localnet` = `dotenvx run -f .env.localnet -- prisma migrate deploy`.

## How it works

- The root `localnet` script (`scripts/start-localnet.mts`, run via `pnpm localnet`) resolves the
  requested apps, optionally migrates, then spawns each package's `dev:localnet` script, prefixing
  and colouring its logs.
- **indexer-gateway** (`packages/indexer/gateway`) is a PostGraphile server that auto-introspects the
  backend localnet's `squid_archive` DB and serves it at `http://127.0.0.1:8000/graphql`. Its
  `dev:localnet` = `dotenvx run -f .env.localnet -- pnpm start`; config lives in
  `packages/indexer/gateway/.env.localnet` (`DATABASE_URL` → the `squid_archive` DB, `PORT=8000`).
  It runs with `--watch` (picks up the schema once `substrate-ingest` creates the tables),
  `--retry-on-init-fail` (tolerates Postgres still coming up), and `--host 0.0.0.0` — the latter is
  required because PostGraphile's default `localhost` binds IPv6 `::1` only, which the swap service's
  IPv4 `127.0.0.1` `INGEST_GATEWAY_URL` cannot reach.
- **swap** defines `dev:localnet` = `dotenvx run -f .env.localnet -- pnpm dev`. Its localnet config
  (DB URL, RPC URLs, ingest gateway, ports, network) lives in `packages/swap/.env.localnet`. **To
  change a port or endpoint, edit that file.** Key values: `INGEST_GATEWAY_URL=http://127.0.0.1:8000/graphql`
  (the gateway above), `SWAPPING_APP_PORT=8081`, `START_PROCESSOR=true`, `START_HTTP_SERVICE=true`.

## Troubleshooting

- **`ECONNREFUSED` to `:9944`, `:5432`, or `:6379`** — the `chainflip-backend` localnet isn't
  running (or still starting). Start it first and wait for it to be healthy.
- **Swap processor gets empty/errored results from `:8000`** — the gateway is up but the
  `squid_archive` DB has no tables yet because `substrate-ingest` hasn't produced any blocks. Wait
  for the backend localnet to ingest a few blocks; `--watch` makes the gateway pick up the schema
  automatically once the tables appear (no restart needed).
- **Prisma / relation-does-not-exist errors** — run `pnpm migrate:deploy:localnet` or start with
  `--migrate`.
- **`Unknown app(s): …`** — run `pnpm localnet --list` to see valid names.

## Related

- **Backend services** (explorer, cache, LP, reporting — not required for the swap stack):
  [chainflip-web-services/LOCALNET.md](https://github.com/chainflip-io/chainflip-web-services/blob/main/LOCALNET.md)
- **Frontend apps:** [chainflip-frontend-monorepo/LOCALNET.md](https://github.com/chainflip-io/chainflip-frontend-monorepo/blob/main/LOCALNET.md)
