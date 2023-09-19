import { ArgumentsCamelCase, InferredOptionTypes, Options } from 'yargs';
import { Assets, Chains } from '@/shared/enums';
import { assert } from '@/shared/guards';
import { CcmMetadata } from '@/shared/schemas';
import { BrokerClient } from '../lib';

export const yargsOptions = {
  'src-asset': {
    choices: Object.values(Assets),
    describe: 'The asset to swap from',
    demandOption: true,
  },
  'dest-asset': {
    choices: Object.values(Assets),
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
  'src-chain': {
    choices: Object.values(Chains),
    describe: 'The chain to swap from',
    demandOption: true,
  },
  'dest-chain': {
    choices: Object.values(Chains),
    describe: 'The chain to swap to',
    demandOption: true,
  },
  message: {
    type: 'string',
    describe: 'The CCM message that is sent along with the swapped assets',
  },
  'gas-budget': {
    type: 'string',
    describe: 'The amount of gas that is sent with the CCM message',
  },
} as const satisfies { [key: string]: Options };

export default async function cliRequestSwapDepositAddress(
  args: ArgumentsCamelCase<InferredOptionTypes<typeof yargsOptions>>,
) {
  const client = await BrokerClient.create({ url: args.brokerUrl });
  let ccmMetadata: CcmMetadata | undefined;

  if (args.gasBudget || args.message) {
    assert(args.gasBudget, 'missing gas budget');
    assert(args.message, 'missing message');

    ccmMetadata = {
      gasBudget: args.gasBudget,
      message: args.message as `0x${string}`,
    };
  }
  const result = await client.requestSwapDepositAddress({
    srcAsset: args.srcAsset,
    destAsset: args.destAsset,
    destAddress: args.destAddress,
    srcChain: args.srcChain,
    destChain: args.destChain,
    ccmMetadata,
  });

  console.log(`Deposit address: ${result.address}`);
  console.log(`Issued block: ${result.issuedBlock}`);
  console.log(`Expiry block: ${result.expiryBlock}`);
  console.log(`Channel ID: ${result.channelId}`);

  await client.close();
}
