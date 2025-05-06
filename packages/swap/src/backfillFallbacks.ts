import { solanaBroadcasterBroadcastSuccess } from '@chainflip/processor/160/solanaBroadcaster/broadcastSuccess';
import { solanaIngressEgressTransferFallbackRequested as solana180 } from '@chainflip/processor/180/solanaIngressEgress/transferFallbackRequested';
import { solanaIngressEgressBatchBroadcastRequested } from '@chainflip/processor/190/solanaIngressEgress/batchBroadcastRequested';
import { solanaIngressEgressTransferFallbackRequested as solana190 } from '@chainflip/processor/190/solanaIngressEgress/transferFallbackRequested';
import assert from 'assert';
import request from 'graphql-request';
import { z } from 'zod';
import { formatTxRef } from '@/shared/common.js';
import prisma from './client.js';
import env from './config/env.js';
import { gql } from './gql/generated/gql.js';
import { FallbackQueryQuery } from './gql/generated/graphql.js';
import logger from './utils/logger.js';

const broadcastSuccessQuery = gql(/* GraphQL */ `
  query BroadcastSuccessQuery($id: String!) {
    events: allEvents(
      filter: { id: { greaterThan: $id }, name: { equalTo: "SolanaBroadcaster.BroadcastSuccess" } }
      first: 1
      orderBy: ID_ASC
    ) {
      nodes {
        id
        name
        args
        indexInBlock
        block: blockByBlockId {
          height
          timestamp
        }
      }
    }
  }
`);

const findBroadcastSuccess = async (initialId: string, broadcastId: number) => {
  let id = initialId;

  const schema = solanaBroadcasterBroadcastSuccess.transform((args) => ({
    ...args,
    transactionRef: formatTxRef({ chain: 'Solana' as const, data: args.transactionRef }),
  }));

  // limit the number of requests to 100
  // this is to prevent infinite loops in case of a bug
  for (let i = 0; i < 100; i += 1) {
    // find the next broadcast success event after the given id
    const result = await request(env.INGEST_GATEWAY_URL, broadcastSuccessQuery, { id });

    const event = result.events?.nodes[0];
    assert(event, 'no event found');

    const args = schema.parse(event?.args);

    // check if the event is for the given broadcast id
    if (args.broadcastId === broadcastId) {
      return {
        succeededAt: new Date(event.block.timestamp),
        succeededBlockIndex: `${event.block.height}-${event.indexInBlock}`,
        transactionRef: args.transactionRef,
      };
    }

    // if not, set the id to the next event id
    id = event.id;
  }

  throw new Error('Broadcast success not found');
};

const backfillEvents = async (
  event: NonNullable<FallbackQueryQuery['events']>['nodes'][number],
) => {
  const args = z.union([solana190, solana180]).parse(event.args);

  const broadcastRequested = event.block.events.nodes.find(
    (e) => e.name === 'SolanaIngressEgress.BatchBroadcastRequested',
  );

  // should never happen
  if (!broadcastRequested) {
    logger.warn('no broadcast requested event found for transferFallbackRequested', {
      block: event.block.height,
      indexInBlock: event.indexInBlock,
    });
    return;
  }

  const broadcastArgs = solanaIngressEgressBatchBroadcastRequested.parse(broadcastRequested.args);

  // should never happen
  if (!broadcastArgs.egressIds.some(([, id]) => id === args.egressDetails!.egressId[1])) {
    logger.warn('egress id not found in broadcast requested event', {
      block: event.block.height,
      indexInBlock: event.indexInBlock,
    });
    return;
  }

  // find the broadcast success event and data
  const broadcastSuccess = await findBroadcastSuccess(event.id, broadcastArgs.broadcastId);

  const egresses = await prisma.broadcast
    .findUnique({
      where: { nativeId_chain: { chain: 'Solana', nativeId: args.broadcastId } },
    })
    .egresses({ include: { swapRequests: true } });

  // should never happen
  if (egresses?.length !== 1) {
    logger.warn('incorrect number of egresses found for transferFallbackRequested', {
      block: event.block.height,
      indexInBlock: event.indexInBlock,
      egressCount: egresses?.length,
    });
    return;
  }

  const { swapRequests } = egresses[0];

  // should never happen
  if (swapRequests.length !== 1) {
    logger.warn('incorrect number of swap requests found for transferFallbackRequested', {
      block: event.block.height,
      indexInBlock: event.indexInBlock,
      swapRequestCount: swapRequests.length,
    });
    return;
  }

  const [swapRequest] = swapRequests;

  // idempotency check
  if (swapRequest.fallbackEgressId) {
    logger.warn('swap request already has a fallback egress', {
      block: event.block.height,
      indexInBlock: event.indexInBlock,
      swapRequestId: swapRequest.id,
    });
    return;
  }

  // should never happen for a Solana event
  if (!args.egressDetails) {
    logger.warn('egress details not found for transferFallbackRequested', {
      block: event.block.height,
      indexInBlock: event.indexInBlock,
      swapRequestId: swapRequest.id,
    });
    return;
  }

  await prisma.swapRequest.update({
    where: { id: swapRequest.id },
    data: {
      fallbackEgress: {
        create: {
          fallbackDestinationAddress: args.destinationAddress,
          nativeId: args.egressDetails.egressId[1],
          chain: args.egressDetails.egressId[0],
          amount: args.egressDetails.egressAmount.toString(),
          scheduledAt: new Date(event.block.timestamp),
          scheduledBlockIndex: `${event.block.height}-${event.indexInBlock}`,
          broadcast: {
            create: {
              nativeId: broadcastArgs.broadcastId,
              chain: 'Solana',
              requestedAt: new Date(event.block.timestamp),
              requestedBlockIndex: `${event.block.height}-${broadcastRequested.indexInBlock}`,
              ...broadcastSuccess,
            },
          },
        },
      },
      fees: {
        create: {
          type: 'EGRESS',
          amount: args.egressDetails.feeWithheld.toString(),
          asset: swapRequest.destAsset,
        },
      },
    },
  });
};

const solanaTransferFallbackQuery = gql(/* GraphQL */ `
  query FallbackQuery {
    events: allEvents(condition: { name: "SolanaIngressEgress.TransferFallbackRequested" }) {
      nodes {
        id
        indexInBlock
        args
        block: blockByBlockId {
          height
          timestamp
          events: eventsByBlockId(filter: { name: { startsWith: "Solana" } }) {
            nodes {
              indexInBlock
              name
              args
            }
          }
        }
      }
    }
  }
`);

const backfillFallbacks = async () => {
  // finds every transfer fallback requested event for Solana
  const result = await request(env.INGEST_GATEWAY_URL, solanaTransferFallbackQuery);

  for (const event of result.events?.nodes ?? []) {
    // backfill them one at a time
    await backfillEvents(event);
  }
};

export default backfillFallbacks;
