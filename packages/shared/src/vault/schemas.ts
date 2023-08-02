import { decodeAddress } from '@polkadot/util-crypto';
import type ethers from 'ethers';
import { Signer } from 'ethers';
import { z } from 'zod';
import { Assets, Chains } from '../enums';
import {
  btcAddress,
  chainflipNetwork,
  dotAddress,
  ethereumAddress,
  hexString,
  numericString,
} from '../parsers';

const bytesToHex = (arr: Uint8Array | number[]) =>
  `0x${[...arr].map((v) => v.toString(16).padStart(2, '0')).join('')}`;

const utf8ToHex = (str: string) => `0x${Buffer.from(str).toString('hex')}`;

const fromEth = z.object({
  amount: z.union([numericString, hexString, z.bigint()]),
  srcChain: z.literal(Chains.Ethereum),
  srcAsset: z.literal(Assets.ETH),
});

const fromEthToEthereum = fromEth.extend({
  destChain: z.literal(Chains.Ethereum),
  destAddress: ethereumAddress,
});

const fromEthToDot = fromEth.extend({
  destChain: z.literal(Chains.Polkadot),
  destAddress: dotAddress.transform((addr) => bytesToHex(decodeAddress(addr))),
  destAsset: z.literal(Assets.DOT),
});

const fromEthToBtc = fromEth.extend({
  destChain: z.literal(Chains.Bitcoin),
  destAddress: btcAddress.transform(utf8ToHex),
  destAsset: z.literal(Assets.BTC),
});

const erc20Asset = z.union([z.literal(Assets.FLIP), z.literal(Assets.USDC)]);

const fromEthToERC20 = fromEthToEthereum.extend({ destAsset: erc20Asset });

const nativeSwapParamsSchema = z.union([
  fromEthToERC20,
  fromEthToDot,
  fromEthToBtc,
]);

export type NativeSwapParams = z.infer<typeof nativeSwapParamsSchema>;

const fromFlipToEthereumAsset = fromEthToEthereum.extend({
  srcAsset: z.literal(Assets.FLIP),
  destAsset: z.union([z.literal(Assets.USDC), z.literal(Assets.ETH)]),
});

const fromUsdcToEthereumAsset = fromEthToEthereum.extend({
  srcAsset: z.literal(Assets.USDC),
  destAsset: z.union([z.literal(Assets.FLIP), z.literal(Assets.ETH)]),
});

const fromERC20ToDot = fromEthToDot.extend({ srcAsset: erc20Asset });

const fromERC20ToBtc = fromEthToBtc.extend({ srcAsset: erc20Asset });

const tokenSwapParamsSchema = z.union([
  fromFlipToEthereumAsset,
  fromUsdcToEthereumAsset,
  fromERC20ToDot,
  fromERC20ToBtc,
]);

const ccmMetadataSchema = z.object({
  message: z.string(),
  gasBudget: numericString,
});

const ccmFromFlipToEthereumAssset = fromFlipToEthereumAsset.extend({
  ccmMetadata: ccmMetadataSchema,
});

const ccmFromUsdcToEthereumAsset = fromUsdcToEthereumAsset.extend({
  ccmMetadata: ccmMetadataSchema,
});

const tokenCallParamsSchema = z.union([
  ccmFromFlipToEthereumAssset,
  ccmFromUsdcToEthereumAsset,
]);

const nativeCallParamsSchema = fromEthToERC20.extend({
  ccmMetadata: ccmMetadataSchema,
});

export const executeSwapParamsSchema = z.union([
  // call schemas needs to precede swap schemas
  nativeCallParamsSchema,
  tokenCallParamsSchema,
  nativeSwapParamsSchema,
  tokenSwapParamsSchema,
]);

export type ExecuteSwapParams = z.infer<typeof executeSwapParamsSchema>;
export type NativeCallParams = z.infer<typeof nativeCallParamsSchema>;
export type TokenCallParams = z.infer<typeof tokenCallParamsSchema>;
export type TokenSwapParams = z.infer<typeof tokenSwapParamsSchema>;

export const executeOptionsSchema = z.intersection(
  z.object({ signer: z.instanceof(Signer) }).passthrough(),
  z.union([
    z.object({ network: chainflipNetwork }).passthrough(),
    z
      .object({
        network: z.literal('localnet'),
        vaultContractAddress: z.string(),
        srcTokenContractAddress: z.string().optional(),
      })
      .passthrough(),
  ]),
);

export type Overrides = Omit<
  ethers.providers.TransactionRequest,
  'to' | 'data' | 'value' | 'from'
>;

export type ExecuteOptions = z.infer<typeof executeOptionsSchema> & Overrides;
