import { decodeAddress } from '@polkadot/util-crypto';
import { ethers } from 'ethers';
import { z } from 'zod';
import { supportedAsset, ChainId } from '../enums';
import { isNotNull } from '../guards';
import {
  btcAddress,
  dotAddress,
  ethereumAddress,
  numericString,
} from '../parsers';
import { decodeSegwitAddress, segwitRegex } from '../validation/segwitAddr';

const bytesToHex = (arr: Uint8Array | number[]) =>
  `0x${[...arr].map((v) => v.toString(16).padStart(2, '0')).join('')}`;

const base = z.object({ amount: numericString });

const ethereumBase = base.extend({
  destChainId: z.literal(ChainId.Ethereum),
  destAddress: ethereumAddress,
});

const polkadotBase = base.extend({
  destChainId: z.literal(ChainId.Polkadot),
  destAddress: dotAddress.transform((addr) => bytesToHex(decodeAddress(addr))),
});

const bitcoinBase = base.extend({
  destChainId: z.literal(ChainId.Bitcoin),
  destAddress: btcAddress
    .transform((addr) =>
      segwitRegex.test(addr)
        ? decodeSegwitAddress(addr)
        : ethers.utils.base58.decode(addr),
    )
    .refine(isNotNull)
    .transform(bytesToHex),
});

const erc20 = z.union([
  z.literal(supportedAsset.enum.FLIP),
  z.literal(supportedAsset.enum.USDC),
]);

const ethereumNative = ethereumBase.extend({ destTokenSymbol: erc20 }).strict();

const polkadotNative = polkadotBase
  .extend({ destTokenSymbol: z.literal(supportedAsset.enum.DOT) })
  .strict();

const bitcoinNative = bitcoinBase
  .extend({ destTokenSymbol: z.literal(supportedAsset.enum.BTC) })
  .strict();

const nativeSwapParamsSchema = z.union([
  ethereumNative,
  polkadotNative,
  bitcoinNative,
]);

export type NativeSwapParams = z.infer<typeof nativeSwapParamsSchema>;

const tokenSwapParamsSchema = z.union([
  ethereumBase.extend({
    srcTokenSymbol: z.literal(supportedAsset.enum.FLIP),
    destTokenSymbol: z.union([
      z.literal(supportedAsset.enum.USDC),
      z.literal(supportedAsset.enum.ETH),
    ]),
  }),
  ethereumBase.extend({
    srcTokenSymbol: z.literal(supportedAsset.enum.USDC),
    destTokenSymbol: z.union([
      z.literal(supportedAsset.enum.FLIP),
      z.literal(supportedAsset.enum.ETH),
    ]),
  }),
  polkadotNative.extend({ srcTokenSymbol: erc20 }),
  bitcoinNative.extend({ srcTokenSymbol: erc20 }),
]);

export type TokenSwapParams = z.infer<typeof tokenSwapParamsSchema>;

export const executeSwapParamsSchema = z.union([
  nativeSwapParamsSchema,
  tokenSwapParamsSchema,
]);

export type ExecuteSwapParams = z.infer<typeof executeSwapParamsSchema>;
