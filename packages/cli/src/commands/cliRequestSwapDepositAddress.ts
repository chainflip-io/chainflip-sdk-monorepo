import { ArgumentsCamelCase, InferredOptionTypes, Options } from 'yargs';
import { InternalAssets, assetConstants } from '@/shared/enums';
import { assert } from '@/shared/guards';
import { CcmParams } from '@/shared/schemas';
import { broker } from '../lib';

export const yargsOptions = {
  'src-asset': {
    choices: Object.values(InternalAssets),
    demandOption: true,
    describe: 'The asset to swap from',
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
  'broker-url': {
    type: 'string',
    describe: 'The broker URL',
    demandOption: true,
  },
  commission: {
    type: 'number',
    describe: 'The broker commission in bps',
    demandOption: false,
  },
  message: {
    type: 'string',
    describe: 'The CCM message that is sent along with the swapped assets',
  },
  'gas-budget': {
    type: 'string',
    describe: 'The amount of gas that is sent with the CCM message',
  },
  network: {
    type: 'string',
    demandOption: true,
    choices: ['mainnet', 'perseverance', 'backspin', 'sisyphos'],
  },
} as const satisfies { [key: string]: Options };

export default async function cliRequestSwapDepositAddress(
  args: ArgumentsCamelCase<InferredOptionTypes<typeof yargsOptions>>,
) {
  let ccmParams: CcmParams | undefined;

  if (args.gasBudget || args.message) {
    assert(args.gasBudget, 'missing gas budget');
    assert(args.message, 'missing message');

    ccmParams = {
      gasBudget: args.gasBudget,
      message: args.message as `0x${string}`,
    };
  }
  const result = await broker.requestSwapDepositAddress(
    {
      srcChain: assetConstants[args.srcAsset].chain,
      srcAsset: assetConstants[args.srcAsset].asset,
      destChain: assetConstants[args.destAsset].chain,
      destAsset: assetConstants[args.destAsset].asset,
      destAddress: args.destAddress,
      ccmParams,
      commissionBps: args.commission ?? 0,
      affiliates: [],
      fillOrKillParams: {
        retryDurationBlocks: 500,
        refundAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
        minPriceX128: '1',
      },
    },
    {
      url: args.brokerUrl,
    },
    args.network,
  );

  console.log(`Deposit address: ${result.address}`);
  console.log(`Issued block: ${result.issuedBlock}`);
  console.log(`Channel ID: ${result.channelId}`);
}
