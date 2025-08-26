import { chainflipAssets, internalAssetToRpcAsset } from '@chainflip/utils/chainflip';
import { ArgumentsCamelCase, InferredOptionTypes, Options } from 'yargs';
import { assert } from '@/shared/guards.js';
import { CcmParams } from '@/shared/schemas.js';
import { broker } from '../lib/index.js';

export const yargsOptions = {
  'src-asset': {
    choices: chainflipAssets,
    demandOption: true,
    describe: 'The asset to swap from',
  },
  'dest-asset': {
    choices: chainflipAssets,
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
      srcChain: internalAssetToRpcAsset[args.srcAsset].chain,
      srcAsset: internalAssetToRpcAsset[args.srcAsset].asset,
      destChain: internalAssetToRpcAsset[args.destAsset].chain,
      destAsset: internalAssetToRpcAsset[args.destAsset].asset,
      destAddress: args.destAddress,
      ccmParams,
      commissionBps: args.commission ?? 0,
      affiliates: [],
      fillOrKillParams: {
        retryDurationBlocks: 500,
        refundAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
        minPriceX128: '1',
        maxOraclePriceSlippage: 0.5,
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
