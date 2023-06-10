import { z } from 'zod';
import { segwitAddress } from '@/shared/validation/segwitAddr';
import { SupportedAsset, Network, network } from '@/shared/enums';
import { isString } from '@/shared/guards';
import {
  btcAddress,
  dotAddress,
  hexString,
  string,
  unsignedInteger,
} from '@/shared/parsers';

export const assetToNetwork: Record<SupportedAsset, Network> = {
  DOT: 'Polkadot',
  ETH: 'Ethereum',
  FLIP: 'Ethereum',
  USDC: 'Ethereum',
  BTC: 'Bitcoin',
};

export const egressId = z.tuple([
  z.object({ __kind: network }).transform(({ __kind }) => __kind),
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
        chain: assetToNetwork[__kind.toUpperCase() as Uppercase<typeof __kind>],
        address: value,
      } as const),
  );

export const foreignChainAddress = z
  .union([ethChainAddress, dotChainAddress, btcTaprootScriptPubkeyAddress])
  .transform(
    ({ __kind, value }) =>
      ({
        chain: assetToNetwork[__kind.toUpperCase() as Uppercase<typeof __kind>],
        address: value,
      } as const),
  );
