import { z } from 'zod';
import { SupportedAsset, Network, network } from '@/shared/enums';
import {
  btcAddress,
  dotAddress,
  hexString,
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

export const encodedAddress = z
  .union([ethChainAddress, dotChainAddress, btcChainAddress])
  .transform(
    ({ __kind, value }) =>
      ({
        chain: __kind.toUpperCase() as Uppercase<typeof __kind>,
        address: value,
      } as const),
  );
