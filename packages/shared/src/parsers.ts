import { hexToU8a } from '@polkadot/util';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';
import * as ethers from 'ethers';
import { z, ZodErrorMap } from 'zod';
import type { SupportedAsset } from './enums';
import { Chains } from './enums';
import { isString } from './guards';

const errorMap: ZodErrorMap = (issue, context) => ({
  message: `received: ${JSON.stringify(context.data)}`,
});

export const string = z.string({ errorMap });
export const number = z.number({ errorMap });
export const numericString = string.regex(/^[0-9]+$/);
export const hexString = string.regex(/^0x[0-9a-f]+$/i);
export const hexStringFromNumber = numericString
  .transform((arg) => ethers.BigNumber.from(arg).toHexString())
  .refine((arg) => arg.startsWith('0x'));
export const bareHexString = string.regex(/^[0-9a-f]+$/);
export const btcAddress = string
  .regex(/^(bc1|tb1|bcrt1|m)/)
  .or(string.regex(/^[13][a-km-zA-HJ-NP-Z1-9]{25,39}$/)); // not strict

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
  ethers.utils.isAddress(address),
);

export const u128 = z
  .union([numericString, hexString])
  .transform((arg) => BigInt(arg));

export const unsignedInteger = z.union([
  u128,
  z.number().transform((n) => BigInt(n)),
]);

export const stateChainAsset = z
  .enum(['Usdc', 'Flip', 'Dot', 'Eth', 'Btc'])
  .transform((val) => val.toUpperCase() as SupportedAsset);

export const stateChainAssetEnum = z
  .object({ __kind: stateChainAsset })
  .transform(({ __kind }) => __kind);

export const chainflipChain = z.nativeEnum(Chains);
