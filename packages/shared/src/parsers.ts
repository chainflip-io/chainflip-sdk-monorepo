import { isValidSolanaAddress } from '@chainflip/solana';
import * as ss58 from '@chainflip/utils/ss58';
import { z, ZodErrorMap } from 'zod';
import {
  InternalAssets,
  Chains,
  Assets,
  isValidAssetAndChain,
  UncheckedAssetAndChain,
  AssetAndChain,
} from './enums';

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
export const booleanString = string
  .regex(/^(true|false)$/i)
  .transform((v) => v.toLowerCase() === 'true');
export const numericString = string.regex(/^[0-9]+$/);
export const numericOrEmptyString = string.regex(/^[0-9]*$/);
export const hexString = string.refine((v): v is `0x${string}` => /^0x[0-9a-f]*$/i.test(v));
export const hexStringWithMaxByteSize = (maxByteSize: number) =>
  hexString.refine((val) => val.length / 2 <= maxByteSize + 1, {
    message: `String must be less than or equal to ${maxByteSize} bytes`,
  });

export const DOT_PREFIX = 0;

export const chainflipAddress = string.refine(
  (address) => address.startsWith('cF') && ss58.decode(address),
  (address) => ({ message: `${address} is not a valid Chainflip address` }),
);

export const solanaAddress = string.refine(isValidSolanaAddress, (address) => ({
  message: `${address} is not a valid Solana address`,
}));

export const u64 = numericString.transform((arg) => BigInt(arg));

export const u128 = z.union([number, numericString, hexString]).transform((arg) => BigInt(arg));

export const unsignedInteger = z.union([u128, z.number().transform((n) => BigInt(n))]);

export const rustEnum = <U extends string, T extends readonly [U, ...U[]]>(values: T) =>
  z.object({ __kind: z.enum(values) }).transform(({ __kind }) => __kind!);

export const internalAssetEnum = rustEnum(enumValues(InternalAssets));
export const chainEnum = rustEnum(enumValues(Chains));

export const chain = z.nativeEnum(Chains);
export const asset = z.nativeEnum(Assets);

export const uncheckedAssetAndChain = z.object({
  asset: z.string(),
  chain: z.string(),
});

export const assetAndChain = uncheckedAssetAndChain.refine((value): value is AssetAndChain =>
  isValidAssetAndChain(value as UncheckedAssetAndChain),
);

export const chainflipNetwork = z.enum(['backspin', 'sisyphos', 'perseverance', 'mainnet']);
