---
name: add-chain-or-asset
description: Add a new chain or asset to chainflip-sdk-monorepo (shared, sdk, swap, examples packages). Use when adding a chain/asset here, or when the chainflip-add-chain-or-asset orchestrator delegates the sdk step. Covers @chainflip/* dep bumps, enums/consts, address validation, broker/parsers, prisma migration, swap event-handlers, and snapshot regen. Run AFTER product-toolkit has published.
---

# sdk-monorepo: add a chain / asset

Runs **after** product-toolkit publishes. This repo consumes the toolkit via `@chainflip/utils`,
`@chainflip/rpc`, `@chainflip/redis`, `@chainflip/solana`, `@chainflip/processor` — so **start by
bumping those deps** to the freshly-published versions; enum ids/decimals often flow in through
`@chainflip/utils` rather than local edits. All paths relative to this repo root.

## Parameters (contract with the orchestrator)

```
mode | category | chain{ displayName, shortTag, evmChainId?, gasAsset } |
assets[{ internalId, symbol, decimals, contractAddress:{network:addr|null} }] |
networks | linearParentKey
```

## Step 0 — bump deps
Bump `@chainflip/{utils,rpc,redis,processor,solana}` to the versions product-toolkit just
published, install, and typecheck to surface what the new enum types now require.

## The spine (every chain, all categories)

1. **Enums / constants (no local file)** — the chain/asset ids, `assetConstants`,
   `chainConstants`, `getInternalAsset`, etc. now come **entirely from `@chainflip/utils/chainflip`**
   via the dep bump in Step 0. There is **no** local `packages/shared/src/enums.ts` anymore
   (removed in a refactor) — do not create or edit it. `packages/shared/src/schemas.ts` consumes
   these via `getInternalAssets(...)`. Everything below is what still needs hand-editing locally.
2. **Consts** — `packages/shared/src/consts.ts`: `ADDRESSES` map (per-network contract/token
   addresses, `<ASSET>_CONTRACT_ADDRESS`); `getEvmChainId` switch + `<CHAIN>_EVM_CHAIN_ID` record
   (EVM/EVM-compatible only); `chainflipAssetToPriceAssetMap`.
3. **Address validation** — `packages/shared/src/validation/addressValidation.ts`: add
   `validate<Chain>Address` and wire it into the `validators` map for **all 5 networks**
   (`mainnet`/`perseverance`/`sisyphos`/`backspin`/`localnet`).
4. **Parsers** — `packages/shared/src/parsers.ts`: per-chain address zod parser
   (`<chain>Address`) and add it to the `foreignChainAddress` union.
5. **Broker** — `packages/shared/src/broker.ts`: address unions in the deposit-address
   request/response schemas; vault-swap `extraParams` branch keyed on `srcAsset.chain`; the
   `requestSwapDepositAddress` `switch(chain)` "addresses are pre-formatted" cases.
6. **RPC** — `packages/shared/src/rpc/index.ts`: if it has chain-keyed map factories, add the
   chain key (verify current shape — the `rpcAsset` union / `feesInfo` have largely moved upstream
   into `@chainflip/rpc`, so this may need little or nothing locally).
   **Redis:** there is **no** local `packages/shared/src/node-apis/redis.ts` anymore — broadcast
   parsers live in `@chainflip/redis` (product-toolkit). No sdk edit for redis broadcast.
7. **Tx-ref formatting** — `packages/shared/src/common.ts`: `formatTxRef` + the `TxRefData`
   chain-keyed processor-import map (e.g. `<chain>BroadcasterBroadcastSuccess`). Edited on every
   chain add — category-dependent (see matrix).
8. **Pricing** — `packages/swap/src/pricing/index.ts`: add a `coinGeckoIdMap` entry per asset
   (real source map, not just the `__mocks__` fixture). `packages/swap/src/handlers/networkInfo.ts`
   may also need a chain/asset entry.
9. **SDK surface** — `packages/sdk/src/swap/assets.ts` (`assetNames`, asset factories,
   `getTokenContractAddress`); `packages/sdk/src/swap/chains.ts` (`chainFactory(Chains.X)`);
   `packages/sdk/src/swap/sdk.ts` (`switch(res.body.chain)` branches);
   `packages/sdk/src/swap/services/ApiService.ts` (`getChains`/`getPossibleDestinationChains`/
   `getAssets` gating); `packages/sdk/src/swap/v2/types.ts` (`VaultSwapResponse` union);
   `packages/shared/src/api/encodeVaultSwapData.ts` (`EncodedVaultSwapData` union).
10. **Prisma** — `packages/swap/prisma/schema.prisma`: add the chain to `enum Chain` and each asset
    to `enum InternalAsset`, then author a migration:
    `packages/swap/prisma/migrations/<ts>_add_<x>/migration.sql`. Commands (see
    `packages/swap/package.json`): `pnpm run --dir=packages/swap migrate:dev` to author,
    `pnpm generate:models` / `prisma generate` to regenerate the client, `migrate:deploy` for deploy.
11. **Event handlers** — `packages/swap/src/event-handlers/index.ts` (event-name registry:
    `<Chain>IngressEgress`, `<Chain>Broadcaster`, `<Chain>ChainTracking` — note this registry was
    touched by the Arbitrum add but not every era; verify) + `.../common.ts` (`getDepositTxRef`
    switch, `formatForeignChainAddress` switch, `DepositDetailsData` type map, chain-specific
    `@chainflip/processor/<version>/...` imports). Expect a fan-out of version-bump-driven edits
    across `event-handlers/{broadcaster,ingress-egress,swapping,tracking}/*` when the processor dep
    changes.
12. **Examples + snapshots** — `packages/examples/src/*VaultSwap.ts`; regenerate `*.test.ts.snap`
    and update `fixtures.ts`/pricing mocks.

## Category matrix (what differs)

| Concern | EVM | EVM-compatible | non-EVM (SVM) |
|---|---|---|---|
| Address validator | reuse `validateEvmAddress` | `validate<Chain>Address = isValid<Chain>Address` from `@chainflip/utils/<chain>` | validator from `@chainflip/<chain>` (base58/curve) |
| `getEvmChainId` | returns `<CHAIN>_EVM_CHAIN_ID` | returns `<CHAIN>_CHAIN_ID` | returns `undefined` (excluded from signer asserts) |
| `formatForeignChainAddress` (in `shared/src/common.ts`) | raw `address.value` | `hexTo<Chain>Address(address.value)` (NOT base58) | `base58.encode(hexToBytes(...))` / `hexEncodedBase58Address` |
| `formatTxRef` (in `shared/src/common.ts`) | reuse ETH hex branch | strip `0x` (hex) | `base58.encode` |
| Vault-swap encoding | shared EVM branch | EVM branch + `to`/`sourceTokenAddress` as `<chain>Address` (not `hexString`) | separate base58/programId branch |
| Contract address | `<ASSET>_CONTRACT_ADDRESS` (`0x`) | `<ASSET>_CONTRACT_ADDRESS`; gas asset returns `undefined` | `<ASSET>_CONTRACT_ADDRESS` = SPL mint (base58) |

Notes:
- **EVM support is already generic** in this repo — the multi-EVM groundwork (chain-generic
  `chains.ts`/`sdk.ts`, `getEvmChainId`) landed historically in `397005dc`. The `signer.ts`
  `assertSignerIsConnectedToChain` helper referenced there has since been removed/moved, so don't
  look for it; adding an EVM chain is just enum data (via the dep bump) + `<CHAIN>_EVM_CHAIN_ID`
  in `consts.ts` + `chains.ts` factory + `ApiService.ts` gating.
- **EVM-compatible:** treated as EVM for vault-swap encoding but needs chain-specific address
  formatting — watch the `formatForeignChainAddress` case in `shared/src/common.ts` (Tron
  regressed to base58 in `9ae2b611`, corrected to `hexToTronAddress` in `7ddfdaf6`).

## Asset-only path (ref `6f5518e3`)
- `packages/shared/src/consts.ts`: extend the `AddressMap` type + every network entry with the
  new `<ASSET>_CONTRACT_ADDRESS`; add to `chainflipAssetToPriceAssetMap`.
- `packages/sdk/src/swap/assets.ts`: add to `assetNames`.
- `packages/swap/src/pricing/index.ts`: add the asset to `coinGeckoIdMap` (the real source map —
  `6f5518e3` did this, not just the `__mocks__` fixture).
- `packages/swap/prisma/schema.prisma` `enum InternalAsset` + a small migration per asset.
- Asset id/decimals/`getInternalAsset` arrive via the bumped `@chainflip/utils` — confirmed **no**
  local enums edit (`6f5518e3` did not touch any enums file; there is no `enums.ts`).
- Regenerate snapshots (`sdk.test.ts.snap`, `networkInfo.test.ts.snap`), `fixtures.ts`, pricing
  `__mocks__`. No `Chains` array, address validators, `chains.ts`/`ApiService.ts` gating, or new
  package.

## Verify (commands per CLAUDE.md)
- `pnpm typecheck`, `pnpm eslint:check`, `pnpm prettier:check` across the workspace.
- Per-package tests: `pnpm run --dir=packages/shared test`, `pnpm run --dir=packages/sdk test`,
  `pnpm run --dir=packages/swap test` (swap needs Postgres via docker-compose, runs
  `--no-file-parallelism`). Regenerate `*.snap`.
- `pnpm run --dir=packages/swap migrate:dev` applies on a fresh db; `prisma generate` clean.
