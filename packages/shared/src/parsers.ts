import { isValidSolanaAddress } from '@chainflip/solana';
import {
  isValidAssetAndChain,
  AssetAndChain,
  UncheckedAssetAndChain,
  chainflipChains,
  assetSymbols,
} from '@chainflip/utils/chainflip';
import * as ss58 from '@chainflip/utils/ss58';
import { z } from 'zod';

export const booleanString = z
  .string()
  .regex(/^(true|false)$/i)
  .transform((v) => v.toLowerCase() === 'true');
export const numericString = z.string().regex(/^[0-9]+$/);
export const numericOrEmptyString = z.string().regex(/^[0-9]*$/);
export const hexString = z.string().refine((v): v is `0x${string}` => /^0x[0-9a-f]*$/i.test(v));
export const hexStringWithMaxByteSize = (maxByteSize: number) =>
  hexString.refine((val) => val.length / 2 <= maxByteSize + 1, {
    message: `String must be less than or equal to ${maxByteSize} bytes`,
  });

export const DOT_PREFIX = 0;

export const chainflipAddress = z.string().refine(
  (address) => address.startsWith('cF') && ss58.decode(address),
  (address) => ({ message: `${address} is not a valid Chainflip address` }),
);

export const solanaAddress = z.string().refine(isValidSolanaAddress, (address) => ({
  message: `${address} is not a valid Solana address`,
}));

export const u128 = z.union([z.number(), numericString, hexString]).transform((arg) => BigInt(arg));

export const unsignedInteger = z.union([u128, z.number().transform((n) => BigInt(n))]);

export const chain = z.enum(chainflipChains);
export const asset = z.enum(assetSymbols);

export const uncheckedAssetAndChain = z.object({
  asset: z.string(),
  chain: z.string(),
});

export const assetAndChain = uncheckedAssetAndChain.refine((value): value is AssetAndChain =>
  isValidAssetAndChain(value as UncheckedAssetAndChain),
);
