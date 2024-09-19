import { GraphQLClient } from 'graphql-request';
import { InternalAssets } from '@/shared/enums';
import { Event } from '@/swap/gql/generated/graphql';
import processBlocks from '@/swap/processBlocks';
import prisma from '../../client';

const batchEvents = [
  {
    id: '0000000090-000047-2b981',
    blockId: '0000000090-2b981',
    indexInBlock: 47,
    phase: 'ApplyExtrinsic',
    extrinsicId: '0000000090-000012-2b981',
    callId: '0000000090-000012-2b981',
    name: 'Swapping.SwapDepositAddressReady',
    args: {
      boostFee: 0,
      channelId: '23',
      sourceAsset: { __kind: 'Flip' },
      affiliateFees: [],
      depositAddress: { value: '0x1e925147581fed9051858dfe9bb12cae1518d396', __kind: 'Eth' },
      destinationAsset: { __kind: 'Usdc' },
      channelOpeningFee: '0',
      destinationAddress: { value: '0xc53d195a5b7bb82e0bde090048300746c046a015', __kind: 'Eth' },
      brokerCommissionRate: 1000,
      sourceChainExpiryBlock: '267',
    },
    pos: 71,
  },
]
  .sort((a, b) => (a.id < b.id ? -1 : 1))
  .reduce((acc, event) => {
    acc.set(event.blockId, (acc.get(event.blockId) || []).concat([event as Event]));
    return acc;
  }, new Map<string, Event[]>());

describe('new swap events flow', () => {
  beforeAll(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE public."Pool" CASCADE`;
    await prisma.pool.createMany({
      data: Object.values(InternalAssets).map((asset) => ({
        baseAsset: asset,
        quoteAsset: 'Usdc',
        liquidityFeeHundredthPips: 1000,
      })),
    });
  });

  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "Egress", "Broadcast", "Swap", "SwapRequest", "SwapDepositChannel", "FailedSwap" CASCADE`;
  });

  it('handles all the events', async () => {
    const startingHeight = Number(batchEvents.keys().next().value!.split('-')[0]) - 1;
    await prisma.state.upsert({
      where: { id: 1 },
      create: { id: 1, height: startingHeight },
      update: { height: startingHeight },
    });

    const blocksIt = batchEvents.entries();

    jest.spyOn(GraphQLClient.prototype, 'request').mockImplementation(async () => {
      const batch = blocksIt.next();
      if (batch.done) throw new Error('done');
      const [blockId, events] = batch.value;
      const height = Number(blockId.split('-')[0]);
      await prisma.state.upsert({
        where: { id: 1 },
        create: { id: 1, height: height - 1 },
        update: { height: height - 1 },
      });

      return {
        blocks: {
          nodes: [
            {
              height,
              specId: 'test@150',
              timestamp: new Date(height * 6000).toISOString(),
              events: { nodes: events },
            },
          ],
        },
      };
    });

    await expect(processBlocks()).rejects.toThrow('done');
  });
});
