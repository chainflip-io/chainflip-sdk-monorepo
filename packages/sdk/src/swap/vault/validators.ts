import { decodeAddress } from '@polkadot/util-crypto';
import { z } from 'zod';
import { supportedAsset } from '@/shared/enums';
import {
  btcAddress,
  dotAddress,
  ethereumAddress,
  numericString,
} from '@/shared/parsers';
import { ChainId } from '../sdk';

const bytesToHex = (arr: Uint8Array | number[]) =>
  `0x${[...arr].map((v) => v.toString(16).padStart(2, '0')).join('')}`;

const utf8ToHex = (str: string) => `0x${Buffer.from(str).toString('hex')}`;

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
  destAddress: btcAddress.transform(utf8ToHex),
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
