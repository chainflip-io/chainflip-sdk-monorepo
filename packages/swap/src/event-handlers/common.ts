import { z } from 'zod';
import { assetChains } from '@/shared/enums';
import { isString } from '@/shared/guards';
import {
  btcAddress,
  chainflipChain,
  dotAddress,
  hexString,
  string,
  unsignedInteger,
} from '@/shared/parsers';
import { segwitAddress } from '@/shared/validation/segwitAddr';

export const egressId = z.tuple([
  z.object({ __kind: chainflipChain }).transform(({ __kind }) => __kind),
  unsignedInteger,
]);

const ethChainAddress = z.object({
  __kind: z.literal('Eth'),
  value: hexString,
});
const dotChainAddress = z.object({
  __kind: z.literal('Dot'),
  value: dotAddress,
});
const btcChainAddress = z.object({
  __kind: z.literal('Btc'),
  value: hexString
    .transform((v) => Buffer.from(v.slice(2), 'hex').toString())
    .pipe(btcAddress),
});

const btcTaprootScriptPubkeyAddress = z.object({
  __kind: z.literal('Btc'),
  value: z
    .object({
      data: string.regex(/^0x5120/), // taproot script pubkey prefix
    })
    .transform((val) =>
      // TODO 0.9: read BITCOIN_ADDRESS_HRP from rpc: https://github.com/chainflip-io/chainflip-backend/pull/3394
      segwitAddress.encode(process.env.BITCOIN_ADDRESS_HRP as string, 1, [
        ...Buffer.from(val.data.slice(6), 'hex'),
      ]),
    )
    .refine(isString),
});

export const encodedAddress = z
  .union([ethChainAddress, dotChainAddress, btcChainAddress])
  .transform(
    ({ __kind, value }) =>
      ({
        chain: assetChains[__kind.toUpperCase() as Uppercase<typeof __kind>],
        address: value,
      } as const),
  );

export const foreignChainAddress = z
  .union([ethChainAddress, dotChainAddress, btcTaprootScriptPubkeyAddress])
  .transform(
    ({ __kind, value }) =>
      ({
        chain: assetChains[__kind.toUpperCase() as Uppercase<typeof __kind>],
        address: value,
      } as const),
  );
