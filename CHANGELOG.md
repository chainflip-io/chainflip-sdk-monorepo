# Changelog

Note: the swap SDK does NOT adhere to semantic versioning. The major and minor
correspond to the runtime version of the Chainflip protocol that the SDK is
intended to be used with.

Deprecated functionality will be retained for two releases after the release in
which it is deprecated.

## 1.6.5

### Changed

- In order to open a DCA deposit channel, Fill or Kill parameters must now be
  provided.

## 1.6.4

### Changed

- Optional parameter to enable DCA during SDK initialization. The default value
  for this parameter is `false`.
  ```ts
  new ChainflipSDK({
    ...
    enabledFeatures: {
      dca: true;
    };
  });
  ```

## 1.6.3

### Fixed

- Fixed a bug in the smart contract swaps where the CF Parameters were not being
  properly passed to the smart contract call.

## 1.6.2

### Changed

- Upgraded our internal RPC package to remove a web API and improve
  compatibility with React Native/the Hermes compiler.

## 1.6.1

### Changed

- Upgraded our internal Bitcoin package to remove WebAssembly. The WebAssembly
  caused issues with React Native users as there is no WebAssembly runtime.

## 1.6.0

See migration guide [here](https://docs.chainflip.io/swapping/integrations/javascript-sdk/migration-guide-v2)

### Deprecated

- `SwapSDK.prototype.getQuote` is now deprecated
- `SwapSDK.prototype.getStatus` is now deprecated

### Added

- `SwapSDK.prototype.getQuoteV2`
  - Returns an array of quotes instead of single quote and includes new properties.
    - `type`: quote type (DCA or REGULAR)
    - `dcaParams`: object with `numberOfChunks` and `chunkIntervalBlocks`
- `SwapSDK.prototype.getStatusV2`
  - Revamped statuses and support for dca swaps
- `SwapSDK.prototype.requestDepositAddress` supports an optional
  `dcaParams` option. It includes
  - `numberOfChunks`: The number of chunks to split the swap into
  - `chunkIntervalBlocks`: Interval in state-chain blocks between each chunk. (minimum value: 2 blocks)

## 1.5.0

### Added

- `SwapSDK.prototype.requestDepositAddress` supports an optional
  `FillOrKillParams` option. It includes
  - `retryDurationBlocks`: number of blocks to retry the swap if the price was
    lower than the `minPrice`
  - `refundAddress`: the address to refund the funds to in case the price limit
    was never met
  - `minPrice`: the minimum price that the swap can happen at. The swap will not
    go through if the price is below this value
- `SwapSDK.prototype.getStatus` will return a `depositTransactionRef`. This
  references the transaction that triggered a swap. For Bitcoin and EVM chains,
  this is a transaction hash. For Polkadot, it is a block number and extrinsic
  index in the format of `${blockNumber}-${extrinsicIndex}`.
- `SwapSDK.prototype.getStatus` will return a
  `srcChainRequiredBlockConfirmations`. This is the number of confirmations the
  protocol requires before recognizing a transaction as confirmed. For networks
  like Polkadot, there is deterministic finality, and therefore, no confirmation
  count is required.
- `SwapSDK.prototype.getStatus` will return `FillOrKillParams` that includes
  - `retryDurationBlocks`: number of state chain blocks to continue retrying the
    swap if the price is below the expected price
  - `refundAddress`: the address to return the funds to in case of not reaching
    the expected price
  - `minPrice`: the minimum price that the swap can happen at
- `egressType` property has been added to `EGRESS_SCHEDULED`,
  `BROADCAST_REQUESTED`, `BROADCASTED`, `COMPLETE` and `BROADCAST_ABORTED`
  states which can be `SWAP` or `REFUND`. Refund may happen in case of a fill or
  kill swap.
- New failure values added under the `FAILED` state
  - `REFUND_EGRESS_IGNORED`: This happens if the refund egress has been ignored,
    most likely due to refund egress amount being lower than the egress fee.

### Fixed

- `SwapSDK.prototype.getStatus` returned a `broadcastTransactionRef` with a `0x`
  prefix for bitcoin transactions previously. This is not accepted by popular
  bitcoin block explorers and was therefore adjusted to not return a `0x`
  prefix. The returned data was not changed for other chains.
- `SwapSDK.prototype.getStatus` will return deposit channel info even when
  querying directly by swap id.

### Removed

- `getQuote` used to respond with a 500 status code and a JSON response body
  with a string `error` field. A duplicate `message` field was added in version
  1.3 to be consistent with error handling with other parts of the API. The
  `error` field has be removed.

### Deprecated

- `SwapSDK.prototype.getStatus`: `depositTransactionHash` is deprecated and will
  be removed in a future release. Use `depositTransactionRef` instead.
- `SwapSDK.prototype.getStatus`: `ccmMetadata` is deprecated and will be removed
  in a future release. Use `ccmParams` instead.
- `SwapSDK.prototype.requestDepositAddress`: `ccmMetadata` is deprecated and
  will be removed in a future release. Use `ccmParams` instead.
- `SwapSDK.prototype.executeSwap`: `ccmMetadata` is deprecated and will be
  removed in a future release. Use `ccmParams` instead.

## 1.4.2

- `SwapSDK.prototype.getBoostLiquidity` - _new_ method that returns the current
  liquidity state of the boost pools. Supports filtering of the results by:
  - `chainAsset: UncheckedAssetAndChain` - the combination of chain & asset (for
    ex. `{ chain: "Bitcoin", asset: "BTC" }`)
  - `feeTierBps: number` - the fee tier of the pool (for ex. 5, 10, 30)

## 1.4.0

### Added

- `SwapSDK.prototype.getStatus` now returns multiple properties that are used to
  identify a boosted swap and its attributes:
  - `depositBoostedAt` - Timestamp of the boosting action (`DepositBoosted`
    event)
  - `depositBoostedBlockIndex` - {blockId}-{eventIndex} - the index of the event
    in the block
  - `effectiveBoostFeeBps` - The effective boost fee bps taken for the boosted
    swap on this channel.
  - `boostSkippedAt` - Timestamp of the boost skipping action
    (`InsufficientBoostLiquidity` event)
  - `boostSkippedBlockIndex` - {blockId}-{eventIndex} - the index of the event
    in the block
  - `depositChannelMaxBoostFeeBps` - The boost fee limit in bps set by the
    channel opener at the time of opening the deposit channel.
- `SwapSDK.prototype.getStatus` will return the `broadcastTransactionRef`,
  transaction reference (tx hash or id) for the destination chain. This can be
  used to lookup for the transaction on the destination.
- `SwapSDK.prototype.getStatus` will return the list of affiliate brokers for a
  deposit channel if it was opened with affiliates.
- `SwapSDK.prototype.getQuote` supports an optional `brokerCommissionBps` and
  `affiliateBrokers` option. If given, the `brokerCommissionBps` option will be
  used instead of the `brokerCommissionBps` used to initialize the SDK instance.
- `SwapSDK.prototype.getQuote` now returns a `boostQuote` property whenever
  available for the requested route and amount. Currently only available for
  `BTC -> Any` routes.
- `SwapSDK.prototype.requestDepositAddress` supports an optional
  `brokerCommissionBps` and `affiliateBrokers` option. The new options are only
  available when initializing the SDK with a brokerUrl and will be applied only
  to the requested deposit channel.
- `SwapSDK.prototype.requestDepositAddress` now supports creating boostable
  channels by setting the boost fee bps limit that the user is willing to
  tolerate. By passing the `maxBoostFeeBps` option to this method, one can set
  the maximum boost fee in bps for that channel. Default value is 0 which means
  a non-boostable channel is being opened.
- Support for Arbitrum tokens have been added.
- Arbitrum ETH and USDC have been added to the `ChainAssetMap` type:

```diff
type ChainAssetMap<T> = {
  Bitcoin: {
    BTC: T;
  };
  Ethereum: {
    ETH: T;
    USDC: T;
    FLIP: T;
    USDT: T;
  };
  Polkadot: {
    DOT: T;
  };
+ Arbitrum: {
+   ETH: T;
+   USDC: T
+ };
}
```

- Arbitrum has also been added to our `ChainMap` type:

```diff
type ChainMap<T> = {
  Bitcoin: T;
  Ethereum: T;
  Polkadot: T;
+ Arbitrum: T;
}
```

### Changed

- `SwapSDK.prototype.executeSwap` allows to not wait for transaction inclusion
  by passing `{ wait: 0 }` as `txOpts` param now. The method will return the
  transaction hash of the submitted transaction.
- Liquidity fees have been moved from the `includedFees` property on the
  `getQuote` response, into a new `poolInfo` property, which is an array of the
  pools the swap passes through, along with the estimated fee and fee asset.

### Fixed

- `SwapSDK.prototype.getQuote` currently responds with a 500 if there is
  insufficient liquidity. It has been changed to a 400 because there are steps
  the user can take to fix the error, namely change the swap input amount. The
  error message has been changed to a more informative
  `insufficient liquidity for requested amount`.
- `SwapSDK.prototype.getQuote` and `requestSwapDepositChannel` reject requests
  with amounts larger than the largest value of a 128 bit integer.

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
+   USDT: T;
  };
  Polkadot: {
    DOT: T;
  };
}
```

- `broadcastTransactionRef` has been added to the `getStatus` response for
  swaps in the `BROADCASTED`and `COMPLETE` state. For Bitcoin and EVM chains,
  this is a transaction hash. For Polkadot, it is a block number and extrinsic
  index in the format of `${blockNumber}-${extrinsicIndex}`.

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
