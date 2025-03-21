import { arbitrumIngressEgressCcmFailed } from '@chainflip/processor/170/arbitrumIngressEgress/ccmFailed';
import { bitcoinIngressEgressCcmFailed } from '@chainflip/processor/170/bitcoinIngressEgress/ccmFailed';
import { ethereumIngressEgressCcmFailed } from '@chainflip/processor/170/ethereumIngressEgress/ccmFailed';
import { polkadotIngressEgressCcmFailed } from '@chainflip/processor/170/polkadotIngressEgress/ccmFailed';
import { solanaIngressEgressCcmFailed } from '@chainflip/processor/170/solanaIngressEgress/ccmFailed';
import { GraphQLClient } from 'graphql-request';
import z from 'zod';
import { assert } from '@/shared/guards';
import { internalAssetEnum, numericString } from '@/shared/parsers';
import env from '../config/env';
import { GET_CALL } from '../gql/query';
import logger from '../utils/logger';
import { EventHandlerArgs } from '.';

const eventArgs = z.union([
  arbitrumIngressEgressCcmFailed,
  bitcoinIngressEgressCcmFailed,
  ethereumIngressEgressCcmFailed,
  polkadotIngressEgressCcmFailed,
  solanaIngressEgressCcmFailed,
]);

const client = new GraphQLClient(env.INGEST_GATEWAY_URL);

const callSchema = z
  .object({
    call: z.object({
      value: z.discriminatedUnion('__kind', [
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
        z.object({
          __kind: z.literal('contract_ccm_swap_request'),
          sourceAsset: internalAssetEnum,
          depositAmount: numericString,
        }),
      ]),
    }),
  })
  .transform((data) => data.call.value);

/** @deprecated can be removed when 1.8 is on mainnet */
export default async function networkCcmFailed({ prisma, event, block }: EventHandlerArgs) {
  const { reason, origin, destinationAddress, depositMetadata } = eventArgs.parse(event.args);

  assert(
    depositMetadata.sourceChain === 'Ethereum' ||
      depositMetadata.sourceChain === 'Arbitrum' ||
      depositMetadata.sourceChain === 'Solana',
    'unexpected source chain for ccmFailed event',
  );

  let call;
  if (event.callId) {
    call = callSchema.parse(
      (await client.request(GET_CALL, { id: event.callId as string })).call?.args,
    );
  }

  let srcAsset;
  let swapDepositChannelId;
  let txRef;
  let depositAmount;
  if (call) {
    if ('sourceAsset' in call) {
      assert(origin.__kind === 'Vault', 'unexpected origin kind for `ccm_deposit` call');
      txRef = origin.txHash;
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
  } else {
    assert(
      origin.__kind === 'DepositChannel',
      'unexpected origin kind for `process_deposits` call',
    );
    const swapDepositChannel = await prisma.swapDepositChannel.findFirstOrThrow({
      where: {
        depositAddress: origin.depositAddress.address,
        srcChain: origin.depositAddress.chain,
      },
      orderBy: { issuedBlock: 'desc' },
    });
    srcAsset = swapDepositChannel.srcAsset;
    swapDepositChannelId = swapDepositChannel.id;
    depositAmount = 0; // unknown
  }

  await prisma.failedSwap.create({
    data: {
      reason,
      destAddress: destinationAddress.address,
      destChain: destinationAddress.chain,
      depositTransactionRef: txRef,
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
