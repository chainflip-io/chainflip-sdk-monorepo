import { ArgumentsCamelCase, InferredOptionTypes, Options } from 'yargs';
import { InternalAssets, assetConstants } from '@/shared/enums';
import { assert } from '@/shared/guards';
import { CcmMetadata } from '@/shared/schemas';
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
  let ccmMetadata: CcmMetadata | undefined;

  if (args.gasBudget || args.message) {
    assert(args.gasBudget, 'missing gas budget');
    assert(args.message, 'missing message');

    ccmMetadata = {
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
      ccmMetadata,
      commissionBps: args.commission ?? 0,
      affiliates: [],
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
