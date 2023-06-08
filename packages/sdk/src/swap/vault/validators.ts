import { z } from 'zod';
import { supportedAsset } from '@/shared/enums';
import {
  btcAddress,
  dotAddress,
  ethereumAddress,
  numericString,
} from '@/shared/parsers';
import { ChainId } from '../sdk';

const base = z.object({ amount: numericString });

const ethereumBase = base.extend({
  destChainId: z.literal(ChainId.Ethereum),
  destAddress: ethereumAddress,
});

const polkadotBase = base.extend({
  destChainId: z.literal(ChainId.Polkadot),
  destAddress: dotAddress,
});

const bitcoinBase = base.extend({
  destChainId: z.literal(ChainId.Bitcoin),
  destAddress: btcAddress,
});

const erc20 = z.union([
  z.literal(supportedAsset.enum.FLIP),
  z.literal(supportedAsset.enum.USDC),
]);

const ethereumNative = ethereumBase
  .extend({
    destTokenSymbol: erc20,
  })
  .strict();

const polkadotNative = polkadotBase
  .extend({
    destTokenSymbol: z.literal(supportedAsset.enum.DOT),
    srcTokenSymbol: z.undefined(),
  })
  .strict();

const bitcoinNative = bitcoinBase
  .extend({
    destTokenSymbol: z.literal(supportedAsset.enum.BTC),
    srcTokenSymbol: z.undefined(),
  })
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
