# chainflip-sdk

# Running the SDK swap service against a localnet

This runs the SDK swap service (and the squid archive it reads from) in Docker against a
**separately-running `chainflip-backend` localnet**, exposing the swap REST/WebSocket API
on `:8081`. Postgres, Redis and the squid `substrate-ingest` sidecar are provided by the
stack, so you don't need them on the host.

## Where this fits in the full stack

This stack only depends on a running `chainflip-backend` localnet:

1. `chainflip-backend` localnet — state chain node on `:9944`, broker, and the chain RPCs.
2. **This repo** — swap service on `:8081`.

## Quick start

```bash
# migrate the swap DB, then start everything
pnpm localnet --apps all --migrate

# list groups / services
pnpm localnet --list

# stop and remove the stack
pnpm localnet --down

# stop and wipe volumes for a clean DB, then bring it back up migrated
pnpm localnet --down --volumes
pnpm localnet --apps all --migrate
```

## Full details

See [`docker/localnet/README.md`](docker/localnet/README.md) for the authoritative guide:
services and ports, isolated logs, and when a rebuild is required.
