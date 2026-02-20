import { GraphQLClient } from 'graphql-request';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import prisma from '../client.js';
import { check, DOT_ADDRESS } from '../event-handlers/__tests__/utils.js';
import { ChainStateUpdatedArgsMap } from '../event-handlers/tracking/chainStateUpdated.js';
import { GetBatchQuery } from '../gql/generated/graphql.js';
import processBlocks from '../processBlocks.js';

describe(processBlocks, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "ChainTracking", "SwapDepositChannel", private."State" CASCADE`;
  });

  it('dispatches a SwapScheduled event', async () => {
    await prisma.swapDepositChannel.create({
      data: {
        depositAddress: DOT_ADDRESS,
        issuedBlock: 100,
        channelId: 250n,
        srcChain: 'Assethub',
        srcAsset: 'HubDot',
        destAsset: 'Btc',
        destAddress: 'bcrt1pzjdpc799qa5f7m65hpr66880res5ac3lr6y2chc4jsa',
        totalBrokerCommissionBps: 0,
        expectedDepositAmount: '1000000000000000000',
        srcChainExpiryBlock: 1000,
        openingFeePaid: 0,
      },
    });

    await prisma.state.upsert({
      where: { id: 1 },
      create: { id: 1, height: 149 },
      update: { height: 1 },
    });

    const requestSpy = vi
      .spyOn(GraphQLClient.prototype, 'request')
      .mockResolvedValueOnce({
        blocks: {
          nodes: [
            {
              height: 150,
              timestamp: '2024-08-26T00:00:00.000Z',
              hash: '0x6c35d3e08b00e979961976cefc79f9594e8ae12f8cc4e9cabfd4796a1994ccd8',
              specId: 'chainflip-node@100',
              events: {
                nodes: [
                  {
                    name: 'BitcoinChainTracking.ChainStateUpdated',
                    args: check<ChainStateUpdatedArgsMap['Bitcoin']>({
                      newChainState: {
                        blockHeight: 1000,
                        trackedData: {
                          btcFeeInfo: {
                            satsPerKilobyte: 10,
                          },
                        },
                      },
                    }),
                  },
                ],
              },
            },
          ],
        },
      } as GetBatchQuery)
      // terminate the loop
      .mockRejectedValue(Error('clean exit'));

    await expect(processBlocks()).rejects.toThrow('clean exit');
    expect(requestSpy).toHaveBeenCalledTimes(
      1 + // once successfully for the first block
        5, // five failures while we abort the loop
    );
    const trackings = await prisma.chainTracking.findMany();
    expect(trackings).toHaveLength(1);
    expect(trackings[0]).toMatchSnapshot({ id: expect.any(Number), updatedAt: expect.any(Date) });
  });
});
