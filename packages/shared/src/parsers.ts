import { hexToU8a, u8aToHex } from '@polkadot/util';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';
import * as ethers from 'ethers';
import { z, ZodErrorMap } from 'zod';
import {
  ChainflipNetwork,
  InternalAssets,
  ChainflipNetworks,
  Chains,
  Assets,
  isValidAssetAndChain,
  UncheckedAssetAndChain,
} from './enums';
import { isString } from './guards';
import {
  validateBitcoinMainnetAddress,
  validateBitcoinRegtestAddress,
  validateBitcoinTestnetAddress,
} from './validation/addressValidation';

const enumValues = Object.values as <T>(
  obj: T,
) => T extends Record<string, never> ? never : [T[keyof T], ...T[keyof T][]];

const safeStringify = (obj: unknown) =>
  JSON.stringify(obj, (key, value) => (typeof value === 'bigint' ? value.toString() : value));

const errorMap: ZodErrorMap = (_issue, context) => ({
  message: `received: ${safeStringify(context.data)}`,
});
export const string = z.string({ errorMap });
export const number = z.number({ errorMap });
export const numericString = string.regex(/^[0-9]+$/);
export const numericOrEmptyString = string.regex(/^[0-9]*$/);
export const hexString = string.refine((v): v is `0x${string}` => /^0x[0-9a-f]*$/i.test(v));
export const hexStringWithMaxByteSize = (maxByteSize: number) =>
  hexString.refine((val) => val.length / 2 <= maxByteSize + 1, {
    message: `String must be less than or equal to ${maxByteSize} bytes`,
  });

export const hexStringFromNumber = numericString.transform(
  (arg) => `0x${BigInt(arg).toString(16)}`,
);

export const btcAddress = (network: ChainflipNetwork | 'localnet') => {
  if (network === 'mainnet') {
    return string.regex(/^(1|3|bc1)/).refine(validateBitcoinMainnetAddress, (address) => ({
      message: `"${address}" is not a valid Bitcoin mainnet address`,
    }));
  }

  return z.union([
    string.regex(/^(m|n|2|tb1)/).refine(validateBitcoinTestnetAddress, (address) => ({
      message: `"${address}" is not a valid Bitcoin testnet address`,
    })),
    string.regex(/^bcrt1/).refine(validateBitcoinRegtestAddress, (address) => ({
      message: `"${address}" is not a valid Bitcoin regtest address`,
    })),
  ]);
};

export const DOT_PREFIX = 0;

export const dotAddress = z
  .union([string, hexString])
  .transform((arg) => {
    try {
      if (arg.startsWith('0x')) {
        return encodeAddress(hexToU8a(arg), DOT_PREFIX);
      }
      // if substrate encoded, then decode and re-encode to dot format
      const hex = u8aToHex(decodeAddress(arg));
      return encodeAddress(hex, DOT_PREFIX);
    } catch {
      return null;
    }
  })
  .refine(isString, {
    message: `address is not a valid polkadot address`,
  });

export const ethereumAddress = hexString.refine(
  (address) => ethers.isAddress(address),
  (address) => ({ message: `${address} is not a valid ethereum address` }),
);

export const chainflipAddress = string.refine(
  (address) => address.startsWith('cF') && decodeAddress(address),
  (address) => ({ message: `${address} is not a valid chainflip address` }),
);

export const u64 = numericString.transform((arg) => BigInt(arg));

export const u128 = z.union([number, numericString, hexString]).transform((arg) => BigInt(arg));

export const unsignedInteger = z.union([u128, z.number().transform((n) => BigInt(n))]);

export const rustEnum = <U extends string, T extends readonly [U, ...U[]]>(values: T) =>
  z.object({ __kind: z.enum(values) }).transform(({ __kind }) => __kind!);

export const internalAssetEnum = rustEnum(enumValues(InternalAssets));
export const chainEnum = rustEnum(enumValues(Chains));

export const chain = z.nativeEnum(Chains);
export const asset = z.nativeEnum(Assets);
export const chainflipNetwork = z.nativeEnum(ChainflipNetworks);

export const uncheckedAssetAndChain = z.object({
  asset: z.string(),
  chain: z.string(),
});

export const assetAndChain = uncheckedAssetAndChain.refine((value) =>
  isValidAssetAndChain(value as UncheckedAssetAndChain),
);

export const swapType = z.union([
  z
    .object({ __kind: z.literal('CcmPrincipal'), value: unsignedInteger })
    .transform(({ value: ccmId }) => ({ type: 'PRINCIPAL' as const, ccmId })),
  z
    .object({ __kind: z.literal('CcmGas'), value: unsignedInteger })
    .transform(({ value: ccmId }) => ({ type: 'GAS' as const, ccmId })),
  z.object({ __kind: z.literal('Swap') }).transform(() => ({ type: 'SWAP' as const })),
]);
