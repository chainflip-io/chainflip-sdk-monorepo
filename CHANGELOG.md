# Changelog

Note: the swap SDK does NOT adhere to semantic versioning. The major and minor
correspond to the runtime version of the Chainflip protocol that the SDK is
intended to be used with.

Deprecated functionality will be retained for two releases after the release in
which it is deprecated.

## 1.10.0

### Added

- `SwapSDK.prototype.encodeCfParameters` has been added to simplify encoding
  the `cfParameters` for vault swaps.

### Changed

- `SwapSDK.prototype.getAssets` has been extended to allow filtering of
  `vaultSwap` or `depositChannel` capable assets.
- `SwapSDK.prototype.getChains` has been extended to allow filtering of
  `vaultSwap` or `depositChannel` capable chains.

## 1.9.5

### Changed

- JSDocs - especially deprecation notices - are being shipped with the types.

## 1.9.4

### Added

- `SwapSDK.prototype.getStatusV2` has an additional `onChain` property within
  the `swap` property. It contains the LP's account ID and any swap output or
  refund amounts.

## 1.9.3

### Added

- `SwapSDK.prototype.getQuoteV2` has been updated to accept an `isOnChain`
  option which will provide quotes for on-chain swaps. It will also have an
  `isOnChain` property if it is for an on-chain swap.
- `SwapSDK.prototype.getOnChainSwapExtrinsicArgs` has been added to convert the
  quote and fill or kill parameters into arguments that can be passed to the
  extrinsic that is submitted to the State Chain to schedule the on chain swap.

## 1.9.2

### Added

- New type of swap fee `REFUND` has been added. Returned as a part of the fees
  array for swaps that have been refunded.

## 1.9.1

### Fixed

- The `package.json` was changed to make the SDK npm package compatible with
  more build setups and configurations.

## 1.9.0

### Added

- `SwapSDK.prototype.getAssets` now accepts a second optional parameter to
  to retrieve `all` assets, `deposit` assets, or `destination` assets
  respectively.
- `SwapSDK.prototype.getChains` now accepts a second optional parameter to
  to retrieve `all` chains, `deposit` chains, or `destination` chains
  respectively.
- `SwapSDK.prototype.checkBoostEnabled` has been added. It returns a `boolean`
  that says whether or not boosting deposits is enabled.
- `SwapSDK.prototype.getChains` will return Assethub as a possible chain when
  after the network is upgraded to version 1.9.
- `SwapSDK.prototype.getAssets` will return Assethub assets (DOT, USDC, and
  USDT) after the network is upgraded to version 1.9.

### Removed

- `SwapSDK.prototype.getQuote` was removed. You should instead use
  `SwapSDK.prototype.getQuoteV2`.
- `SwapSDK.prototype.getStatus` was removed. You should instead use
  `SwapSDK.prototype.getStatusV2`.
- `SwapSDK.prototype.requestDepositAddress` was removed. You should instead use
  `SwapSDK.prototype.requestDepositAddressV2`.

## 1.8.3

### Added

- `SwapSDK.prototype.getQuoteV2` returns a `isVaultSwap`, `brokerCommissionBps`, `affiliateBrokers`
  and `ccmParams` property now.
- `SwapSDK.prototype.getQuote` returns a `isVaultSwap`, `brokerCommissionBps`, `affiliateBrokers`
  and `ccmParams` property now.

## 1.8.2

### Added

- `SwapSDK.prototype.getQuoteV2` accepts a `ccmParams` property now. The optional property allows to
  estimate the broadcast fee and egress amount for CCM swaps.

## 1.8.1

### Changed

- `SwapSDK.prototype.requestDepositAddress`: The `fillOrKillParams` property is now mandatory when opening a
  deposit channel. This information is mandatory on the protocol level since version 1.8.
- `SwapSDK.prototype.requestDepositAddressV2`: The `fillOrKillParams` property is now mandatory when opening a
  deposit channel. This information is mandatory on the protocol level since version 1.8.

## 1.8.0

### Important!

Vault swaps have been completely revamped for the 1.8 release. The old methods
`executeSwap` and `approveAndExecuteSwap` have been removed and can no longer be
safely used. CONTINUING TO USE THEM WILL RESULT IN A LOSS OF FUNDS.

As a replacement, you should use the new `SwapSDK.prototype.encodeVaultSwapData`
method to get the unsigned transaction data for a swap. This data can be signed
and submitted to the source chain with your preferred web3 library (e.g.
ethers.js or viem). Examples are available in the Chainflip SDK documentation:
https://docs.chainflip.io/swapping/integrations/javascript-sdk/introduction

### Added

- `SwapSDK.prototype.encodeVaultSwapData`: The new method returns the unsigned
  transaction data for initiating a vault swap. The data can be signed and submitted to the
  source chain with your preferred web3 library (e.g. ethers.js or viem).
  This replaces the removed `executeSwap`, `approveAndExecuteSwap` and `approveVault` methods.
  Learn more about vault swaps in the Chainflip SDK documentation:
  https://docs.chainflip.io/swapping/integrations/javascript-sdk/introduction
- `SwapSDK.prototype.getStatusV2` returns a `fillOrKillParams` property that exposes the
  fill-or-kill parameters of the swap. This replaces the deprecated `depositChannel.fillOrKillParams`
  property.
- `SwapSDK.prototype.getStatusV2` returns a `dcaParams` property that exposes the
  fill-or-kill parameters of the swap. This replaces the deprecated `depositChannel.dcaParams`
  property.
- `SwapSDK.prototype.getStatusV2` returns a `brokers` property that exposes the broker and
  affiliate brokers of the swap. This replaces the deprecated `depositChannel.brokerCommissionBps`
  and `depositChannel.affiliateBrokers` properties.

### Changed

- Swap status failure mode `DEPOSIT_TOO_SMALL` has been renamed to `DEPOSIT_IGNORED`

### Deprecated

- `SwapSDK.prototype.getStatusV2`: `depositChannel.brokerCommissionBps` is deprecated and will
  be removed in a future release. Use `brokers` on the root level of the return value instead.
- `SwapSDK.prototype.getStatusV2`: `depositChannel.affiliateBrokers` is deprecated and will
  be removed in a future release. Use `brokers` on the root level of the return value instead.
- `SwapSDK.prototype.getStatusV2`: `depositChannel.fillOrKillParams` is deprecated and will
  be removed in a future release. Use `fillOrKillParams` on the root level of the return value instead.
- `SwapSDK.prototype.getStatusV2`: `depositChannel.dcaParams` is deprecated and will
  be removed in a future release. Use `dcaParams` on the root level of the return value instead.
- `SwapSDK.prototype.requestDepositAddress`: The `ccmParams.cfParameters` property of the `DepositAddressRequest`
  type is deprecated and will be removed in a future release. Set `ccmParams.ccmAdditionalData` instead.
- `SwapSDK.prototype.requestDepositAddressV2`: The `ccmParams.cfParameters` property of the `DepositAddressRequestV2`
  type is deprecated and will be removed in a future release. Set `ccmParams.ccmAdditionalData` instead.
- `SwapSDKOptions`: The `broker.commissionBps` option in the global `SwapSDKOptions` object is deprecated and will
  be removed in a future release. Set the `brokerCommissionBps` param of the `SwapSDK.prototype.encodeVaultSwapData`
  method and `SwapSDK.prototype.requestDepositAddressV2` method instead.

### Removed

- `SwapSDK.prototype.executeSwap` and `SwapSDK.prototype.approveAndExecuteSwap`:
  The methods were removed because they will no longer be supported by the State
  Chain in their current form after the network is upgraded to 1.8.
  Use the new `SwapSDK.prototype.encodeVaultSwapData` method instead.
- `SwapSDK.prototype.approveVault`: The method was removed because vault swaps
  have been fundamentally changed in the 1.8 release and are no longer
  executable via the Swapping SDK.
  Use the new `SwapSDK.prototype.encodeVaultSwapData` method instead.

## 1.7.0

### Added

- A new method has been added to the `SwapSDK`, `requestDepositAddressV2`. This
  event simplifies deposit channel creation by accepting the quote that is
  returned by the SDK to set the correct assets, DCA parameters, and Boost fee.
- A new method has been added to the `SwapSDK`, `approveAndExecuteSwap`.
  This is a convenience method that can be used to skip the manual token
  allowance approval. Upon calling, the method will make sure there is enough
  ERC20 token allowance before proceeding with initiating the swap.
- `SwapSDK.prototype.getQuoteV2` returns a `recommendedSlippageTolerancePercent`
  property now. The value is calculated based on current market conditions to prevent
  refunds while protecting against big price movements. It can be passed into
  the `requestDepositAddressV2` method to set the slippage tolerance for a swap.
- `SwapSDK.prototype.getStatusV2` and `SwapSDK.prototype.getQuoteV2` return an
  `estimatedDurationsSeconds` property now. It includes the estimated time in seconds
  different stages of a swap:
  - `deposit`: time for a deposit to be witnessed and the respective swap being scheduled
  - `swap`: time for a swap to be fully executed
  - `egress`: time until the output transaction is included in a block

### Changed

- Fill or Kill parameters are now mandatory when opening a deposit channel through
  the default broker endpoint. If you are using your own broker, the parameters are
  still optional for now.
- `SwapSDK.prototype.getStatus`: deprecated `depositTransactionHash` was removed.
  Use `depositTransactionRef` instead.
- `SwapSDK.prototype.getStatus`: deprecated `ccmMetadata` was removed.
  Use `ccmParams` instead.
- `SwapSDK.prototype.requestDepositAddress`: deprecated `ccmMetadata` was removed.
  Use `ccmParams` instead.
- `SwapSDK.prototype.executeSwap`: deprecated `ccmMetadata` was removed.
  Use `ccmParams` instead.

## 1.6.6

### Fixed

- Polkadot destination address were being improperly validated before being sent
  to the broker.

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
