# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Install dependencies (uses pnpm workspaces)
pnpm install

# Run all checks (prettier, eslint, typecheck) - runs across all packages
pnpm prettier:check
pnpm eslint:check
pnpm typecheck

# Fix formatting/linting
pnpm prettier:write
pnpm eslint:fix

# Package-specific commands (run from package directory or use --dir flag)
pnpm run --dir=packages/sdk test          # Run SDK tests
pnpm run --dir=packages/swap test         # Run swap service tests
pnpm run --dir=packages/shared test       # Run shared tests
pnpm run --dir=packages/sdk build         # Build SDK
pnpm run --dir=packages/swap build        # Build swap service

# Run a single test file
pnpm run --dir=packages/swap test src/path/to/file.test.ts

# Swap service development (requires envlocker setup)
pnpm run --dir=packages/swap dev:perseverance  # Run against perseverance testnet

# Database migrations (swap package)
pnpm run --dir=packages/swap migrate:dev       # Create migration
pnpm run --dir=packages/swap migrate:deploy    # Apply migrations
```

## Architecture Overview

This is a pnpm monorepo for Chainflip cross-chain swap infrastructure:

```
packages/
├── sdk/        # @chainflip/sdk - Public npm package for integrators
├── swap/       # Private backend service (Express + Prisma + WebSocket)
├── shared/     # @chainflip-io/shared - Shared types, schemas, utilities
├── cli/        # @chainflip/cli - Command-line tool
├── examples/   # Usage examples
└── indexer/    # GraphQL gateway (postgraphile)
```

### Package Relationships

- **SDK** imports from `@/shared/*` and communicates with the **swap** backend via REST API
- **Swap service** imports from `@/shared/*`, queries blockchain data from Ingest Gateway (GraphQL), and uses Prisma for PostgreSQL
- **Shared** contains Zod schemas, validation, chain-specific utilities, and contract ABIs - cannot import from other packages

### Key Path Aliases

Configured in `tsconfig.json`:
- `@/shared/*` → `./packages/shared/src/*`
- `@/swap/trpc.js` → `./packages/swap/src/trpc.js`

### SDK Structure

Exports two entry points:
- `@chainflip/sdk/swap` - SwapSDK class with `getQuoteV2()`, `requestDepositAddressV2()`, `encodeVaultSwapData()`
- `@chainflip/sdk/funding` - FundingSDK class for liquidity provider operations

### Swap Service Architecture

The swap backend runs as:
1. **HTTP Server** (Express) - REST API for quotes and swap status at `/v2/quote`, `/v2/swaps/{id}`
2. **Block Processor** - Fetches blocks from Ingest Gateway, processes 40+ event types via versioned handlers
3. **WebSocket Server** (Socket.io) - Real-time quoting with market makers

Environment flags: `START_PROCESSOR=TRUE`, `START_HTTP_SERVICE=TRUE`

### Event Handler Pattern

Event handlers in `packages/swap/src/event-handlers/` are versioned by spec (e.g., `1.0.0`, `1.5.0`, `2.0.0`). Each handler processes blockchain events and updates Prisma models. Events are mapped by pallet: Swapping, IngressEgress, Broadcaster, LiquidityPools.

## Testing

- Uses Vitest with shared config in `vitest.shared.mts`
- Swap tests require PostgreSQL (docker-compose provided)
- Tests run with `--no-file-parallelism` for swap package due to database state

## Code Style

- ESLint extends airbnb-base with TypeScript rules
- Unused variables must be prefixed with `_`
- Import order: external → internal (`@/**`) → sibling/parent → index
- Shared package cannot import from other packages (enforced by eslint)

## Multi-Chain Support

Supports Bitcoin, Ethereum, Polkadot, Solana, and Arbitrum. Chain-specific logic uses:
- `@chainflip/bitcoin`, `@chainflip/solana` for chain operations
- Generic event patterns mapped per chain (e.g., `EthereumIngressEgress`, `BitcoinIngressEgress`)
- Address validation in `packages/shared/src/validation/`
