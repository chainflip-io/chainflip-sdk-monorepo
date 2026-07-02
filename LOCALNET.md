# Running the SDK monorepo against a localnet

This guide explains how to run the **sdk-monorepo** swap service against a locally running
`chainflip-backend` localnet, using the `pnpm localnet` orchestrator added in
[WEB-3578](https://linear.app/chainflip/issue/WEB-3578).

> Part of the full local stack: **chainflip-backend → [web-services](https://github.com/chainflip-io/chainflip-web-services/blob/main/LOCALNET.md) → sdk-monorepo → [frontend-monorepo](https://github.com/chainflip-io/chainflip-frontend-monorepo/blob/main/LOCALNET.md)**.

## Prerequisites

1. **A running `chainflip-backend` localnet.** From your `chainflip-backend` checkout run
   `./localnet/manage.sh` and pick `build-localnet`. It provides everything the swap service
   connects to:

   | Dependency        | Endpoint                                          |
   | ----------------- | ------------------------------------------------- |
   | State chain RPC   | `ws://127.0.0.1:9944`, `http://127.0.0.1:9944`    |
   | Broker            | `http://127.0.0.1:10997`                          |
   | Ingest gateway    | `http://127.0.0.1:8000/graphql` (web-services `indexer-gateway`) |
   | Postgres          | `127.0.0.1:5432` (user/pass `postgres`/`postgres`) |
   | Redis             | `127.0.0.1:6379`                                  |
   | Solana            | `http://localhost:8899`                           |

   The network name is `backspin`.

   > The swap service reads its ingest data from the web-services `indexer-gateway` on `:8000`. Start
   > that first with `pnpm localnet --apps swap` in **chainflip-web-services** (see its
   > [LOCALNET.md](https://github.com/chainflip-io/chainflip-web-services/blob/main/LOCALNET.md)).

2. **Dependencies installed:** `pnpm install`.
3. **Prisma models generated:** `pnpm -r exec prisma generate`.
4. **The swap DB migrated** (first run, or after schema changes) — see [Migrations](#migrations).

## Quick start

```bash
# Migrate the swap DB, then start the swap service against the localnet
pnpm localnet --apps all --migrate

# Or just start the swap service (assumes the DB is already migrated)
pnpm localnet --apps swap
```

The swap HTTP/processor service comes up on **`:8081`**.

## What can I start?

`pnpm localnet` takes **groups** or individual **service** names. List them any time:

```bash
pnpm localnet --list
```

| Group / service | Expands to | Port  |
| --------------- | ---------- | ----- |
| `all`           | swap       | —     |
| `swap`          | swap       | `8081` |

Friendly alias: `sdk-swap` → `swap`.

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
- The swap package defines `dev:localnet` = `dotenvx run -f .env.localnet -- pnpm dev`.
- All localnet configuration (DB URL, RPC URLs, ingest gateway, ports, network) lives in
  `packages/swap/.env.localnet`. **To change a port or endpoint, edit that file.** Key values:
  `SWAPPING_APP_PORT=8081`, `START_PROCESSOR=true`, `START_HTTP_SERVICE=true`.

## Troubleshooting

- **`ECONNREFUSED` to `:9944`, `:5432`, `:6379`, or `:8000`** — the `chainflip-backend` localnet
  isn't running, or the web-services `indexer-gateway` (`:8000`) isn't up yet. Start the backend
  first, then the indexer-gateway.
- **Prisma / relation-does-not-exist errors** — run `pnpm migrate:deploy:localnet` or start with
  `--migrate`.
- **`Unknown app(s): …`** — run `pnpm localnet --list` to see valid names.

## Related

- **Backend services:** [chainflip-web-services/LOCALNET.md](https://github.com/chainflip-io/chainflip-web-services/blob/main/LOCALNET.md)
- **Frontend apps:** [chainflip-frontend-monorepo/LOCALNET.md](https://github.com/chainflip-io/chainflip-frontend-monorepo/blob/main/LOCALNET.md)
