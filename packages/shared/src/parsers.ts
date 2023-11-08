import { hexToU8a } from '@polkadot/util';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';
import * as ethers from 'ethers';
import { z, ZodErrorMap } from 'zod';
import type { Asset, ChainflipNetwork } from './enums';
import { Assets, ChainflipNetworks, Chains, assetChains } from './enums';
import { isString } from './guards';
import {
  validateBitcoinMainnetAddress,
  validateBitcoinRegtestAddress,
  validateBitcoinTestnetAddress,
} from './validation/addressValidation';

const safeStringify = (obj: unknown) =>
  JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value,
  );

const errorMap: ZodErrorMap = (_issue, context) => ({
  message: `received: ${safeStringify(context.data)}`,
});

export const string = z.string({ errorMap });
export const number = z.number({ errorMap });
export const numericString = string.regex(/^[0-9]+$/);
export const hexString = z.custom<`0x${string}`>(
  (val) => typeof val === 'string' && /^0x[0-9a-f]+$/i.test(val),
);
export const hexStringFromNumber = numericString.transform(
  (arg) => `0x${BigInt(arg).toString(16)}`,
);
export const bareHexString = string.regex(/^[0-9a-f]+$/);

export const btcAddress = (env?: ChainflipNetwork) => {
  const network = env ?? process.env.CHAINFLIP_NETWORK;
  if (network === 'mainnet')
    return string.regex(/^(1|3|bc1)/).refine(validateBitcoinMainnetAddress);

  return z.union([
    string.regex(/^(m|n|2|tb1)/).refine(validateBitcoinTestnetAddress),
    string.regex(/^bcrt1/).refine(validateBitcoinRegtestAddress),
  ]);
};

export const dotAddress = z
  .union([string, hexString])
  .transform((arg) => {
    try {
      if (arg.startsWith('0x')) {
        return encodeAddress(hexToU8a(arg));
      }
      // this will throw if the address is invalid
      decodeAddress(arg);
      return arg;
    } catch {
      return null;
    }
  })
  .refine(isString);

export const ethereumAddress = hexString.refine((address) =>
  ethers.isAddress(address),
);

export const u64 = numericString.transform((arg) => BigInt(arg));

export const u128 = z
  .union([numericString, hexString])
  .transform((arg) => BigInt(arg));

export const unsignedInteger = z.union([
  u128,
  z.number().transform((n) => BigInt(n)),
]);

export const chainflipAssetEnum = z
  .object({ __kind: z.enum(['Usdc', 'Flip', 'Dot', 'Eth', 'Btc']) })
  .transform(({ __kind }) => __kind.toUpperCase() as Asset);

const transformAsset = <T extends Asset>(
  asset: T,
): { asset: T; chain: (typeof assetChains)[T] } =>
  ({ asset, chain: assetChains[asset] }) as const;

export type AssetAndChain = {
  [A in Asset]: { asset: A; chain: (typeof assetChains)[A] };
}[Asset];

export const chainflipChain = z.nativeEnum(Chains);
export const chainflipAsset = z.nativeEnum(Assets);

export const chainflipAssetAndChain = z
  .union([
    chainflipAsset.transform(transformAsset),
    z.object({ asset: z.nativeEnum(Assets), chain: z.nativeEnum(Chains) }),
  ])
  .superRefine((obj, ctx): obj is AssetAndChain => {
    if (assetChains[obj.asset] !== obj.chain) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `asset ${obj.asset} does not belong to chain ${obj.chain}`,
        path: [],
      });
    }

    return z.NEVER;
  });

export const chainflipNetwork = z.nativeEnum(ChainflipNetworks);

export const swapType = z.union([
  z
    .object({ __kind: z.literal('CcmPrincipal'), value: unsignedInteger })
    .transform(({ value: ccmId }) => ({ type: 'PRINCIPAL' as const, ccmId })),
  z
    .object({ __kind: z.literal('CcmGas'), value: unsignedInteger })
    .transform(({ value: ccmId }) => ({ type: 'GAS' as const, ccmId })),
  z
    .object({ __kind: z.literal('Swap') })
    .transform(() => ({ type: 'SWAP' as const })),
]);
