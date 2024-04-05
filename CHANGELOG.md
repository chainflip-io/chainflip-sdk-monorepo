# Changelog

Note: the swap SDK does NOT adhere to semantic versioning. The major and minor
correspond to the runtime version of the Chainflip protocol that the SDK is
intended to be used with.

Deprecated functionality will be retained for two releases after the release in
which it is deprecated.

## Deprecation warnings

### 1.3.0

- `getQuote` can respond with a 500 status code and a JSON response body with an
  string `error` field. This field has been replaced by `message` to be inline
  with how errors are returned in other parts of the API.
- `getQuote` returns a 500 for quotes for which there is insufficient liquidity.
  This has been changed to return a 400, because there is action the user can
  take to resolve there error.

## Unreleased

## Changed

- `getQuote` responds with a 500 if there is insufficient liquidity. It has been
  changed to a 400 because there are steps the user can take to fix the error,
  namely change the swap input amount. The error message has been changed to a
  more informative `insufficient liquidity for requested amount`.

## Unreleased

### Changed

- `SwapSDK.prototype.executeSwap` allows to not wait for transaction inclusion
  by passing `{ wait: 0 }` as `txOpts` param now. The method will return the
  transaction hash of the submitted transaction.

## 1.3.0

### Added

- `SwapSDK.prototype.requestDepositAddress` now returns the `channelOpeningFee`,
  of type `bigint`. It is measured in Flipperino (the base unit of $FLIP). This
  fee is incurred when a broker opens a swap deposit channel.
- `SwapSDK.prototype.channelOpeningFees` has been added and returns the channel
  opening fee for each chain. It returns a map of each supported
  `ChainflipChain` to a `bigint` which is the fee in Flipperino to open a swap
  deposit channel.
- `SwapSDK.prototype.getRequiredBlockConfirmations` has been added. It returns
  `ChainMap<number | null>` which signifies the number of confirmations the
  protocol requires before recognizing a transaction as confirmed. For networks
  like Polkadot, there is deterministic finality, and therefore, no confirmation
  count is required.
- `USDT` has been added to our `ChainAssetMap` data structure under the
  `Ethereum` key:

```diff
type ChainAssetMap<T> = {
    Bitcoin: {
        BTC: T;
    };
    Ethereum: {
        ETH: T;
        USDC: T;
        FLIP: T;
+       USDT: T;
    };
    Polkadot: {
        DOT: T;
    };
}
```

- `broadcastTransactionRef` has been added to the `getStatus` response for
  swaps in the `BROADCASTED`and `COMPLETE` state. For Bitcoin and EVM chains, this is a
  transaction hash. For Polkadot, it is a block number and extrinsic index in
  the format of `${blockNumber}-${extrinsicIndex}`.

### Changed

- `SwapSDK.prototype.getRequiredBlockConfirmations` now has a return type of
  `ChainMap<number | null>` instead of `ChainMap<number | undefined>` to be more
  consistent with existing return types.
- `SwapSDK.prototype.getAssets` now uses the `cf_supported_assets` RPC method to
  determine the supported assets of the connected Chainflip network. The format
  of the returned data was not changed.
- `SwapSDK.prototype.getChains` now uses the `cf_supported_assets` RPC method to
  determine the supported chains of the connected Chainflip network. The format
  of the returned data was not changed.

### Deprecated

- `getQuote` can respond with a 500 status code and a JSON response body with an
  string `error` field. A duplicate `message` field has been added to be
  consistent with error handling with other parts of the API. The `error` field
  will be removed in a future release.

### Fixed

- `getQuote` can respond with a 500 status code and a JSON response body with an
  string `error` field. This field has been duplicated as `message` to be inline
  with how errors are handled in the other methods. The `error` field has been
  deprecated and will be removed after 1.4.0
- removed the `0x` prefix from Bitcoin transaction hashes in the status response
