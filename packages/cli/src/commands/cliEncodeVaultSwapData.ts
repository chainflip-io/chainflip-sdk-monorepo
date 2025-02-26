import { ArgumentsCamelCase, InferredOptionTypes, Options } from 'yargs';
import { InternalAssets, assetConstants } from '@/shared/enums';
import { broker } from '../lib';

export const yargsOptions = {
  'src-asset': {
    choices: Object.values(InternalAssets),
    demandOption: true,
    describe: 'The asset to swap from',
  },
  'src-address': {
    type: 'string',
    demandOption: true,
    describe: 'The address that sends the assets to Chainflip',
  },
  'dest-asset': {
    choices: Object.values(InternalAssets),
    demandOption: true,
    describe: 'The asset to swap to',
  },
  'dest-address': {
    type: 'string',
    demandOption: true,
    describe: 'The address to send the swapped assets to',
  },
  amount: {
    type: 'string',
    demandOption: true,
    describe: 'The source asset amount to swap',
  },
  'broker-url': {
    type: 'string',
    describe: 'The broker URL',
    demandOption: true,
  },
  network: {
    type: 'string',
    demandOption: true,
    choices: ['mainnet', 'perseverance', 'backspin', 'sisyphos'],
  },
} as const satisfies { [key: string]: Options };

export default async function cliEncodeVaultSwapData(
  args: ArgumentsCamelCase<InferredOptionTypes<typeof yargsOptions>>,
) {
  const result = await broker.requestSwapParameterEncoding(
    {
      srcAsset: assetConstants[args.srcAsset],
      srcAddress: args.srcAddress,
      destAsset: assetConstants[args.destAsset],
      destAddress: args.destAddress,
      amount: args.amount,
      fillOrKillParams: {
        refundAddress: args.srcAddress,
        retryDurationBlocks: 500,
        minPriceX128: '1',
      },
      commissionBps: undefined,
      ccmParams: undefined,
      maxBoostFeeBps: undefined,
      affiliates: undefined,
      dcaParams: undefined,
      extraParams: undefined,
    },
    {
      url: args.brokerUrl,
    },
    args.network,
  );

  console.log(result);
}
