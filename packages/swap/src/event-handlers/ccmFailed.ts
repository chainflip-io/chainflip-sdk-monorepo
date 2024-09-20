import { swappingCcmFailed } from '@chainflip/processor/160/swapping/ccmFailed';
import { GraphQLClient } from 'graphql-request';
import z from 'zod';
import { assert } from '@/shared/guards';
import { internalAssetEnum, numericString } from '@/shared/parsers';
import env from '../config/env';
import { GET_CALL } from '../gql/query';
import logger from '../utils/logger';
import { EventHandlerArgs } from '.';

const eventArgs = swappingCcmFailed;

const client = new GraphQLClient(env.INGEST_GATEWAY_URL);

const callSchema = z
  .object({
    call: z.object({
      value: z.union([
        z.object({
          __kind: z.literal('ccm_deposit'),
          sourceAsset: internalAssetEnum,
          depositAmount: numericString,
        }),
        z.object({
          __kind: z.literal('process_deposits'),
          depositWitnesses: z.array(
            z.object({
              asset: internalAssetEnum,
              amount: numericString,
            }),
          ),
        }),
      ]),
    }),
  })
  .transform((data) => data.call.value);

export default async function ccmFailed({ prisma, event, block }: EventHandlerArgs) {
  const { reason, origin, destinationAddress, depositMetadata } = eventArgs.parse(event.args);

  assert(
    depositMetadata.sourceChain === 'Ethereum' || depositMetadata.sourceChain === 'Arbitrum',
    'unexpected source chain for ccmFailed event',
  );

  const call = callSchema.parse(
    (await client.request(GET_CALL, { id: event.callId as string })).call?.args,
  );

  let srcAsset;
  let swapDepositChannelId;
  let txHash;
  let depositAmount;
  if ('sourceAsset' in call) {
    assert(origin.__kind === 'Vault', 'unexpected origin kind for `ccm_deposit` call');
    txHash = origin.txHash;
    srcAsset = call.sourceAsset;
    depositAmount = call.depositAmount;
  } else {
    assert(call.depositWitnesses.length > 0, 'unexpected number of depositWitnesses');
    assert(
      origin.__kind === 'DepositChannel',
      'unexpected origin kind for `process_deposits` call',
    );
    srcAsset = call.depositWitnesses[0].asset;
    swapDepositChannelId = (
      await prisma.swapDepositChannel.findFirstOrThrow({
        where: {
          depositAddress: origin.depositAddress.address,
          srcChain: origin.depositAddress.chain,
        },
        orderBy: { issuedBlock: 'desc' },
      })
    ).id;
    if (call.depositWitnesses.length > 1) {
      logger.warn('more than 1 deposit found, using first deposit for amount');
    }
    depositAmount = call.depositWitnesses[0].amount;
  }

  await prisma.failedSwap.create({
    data: {
      reason,
      destAddress: destinationAddress.address,
      destChain: destinationAddress.chain,
      depositTransactionRef: txHash,
      srcChain: depositMetadata.sourceChain,
      srcAsset,
      ccmGasBudget: depositMetadata.channelMetadata.gasBudget.toString(),
      ccmMessage: depositMetadata.channelMetadata.message,
      depositAmount,
      failedAt: new Date(block.timestamp),
      failedBlockIndex: `${block.height}-${event.indexInBlock}`,
      swapDepositChannelId,
    },
  });
}
