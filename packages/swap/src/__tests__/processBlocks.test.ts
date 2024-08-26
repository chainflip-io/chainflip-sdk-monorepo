import { GraphQLClient } from 'graphql-request';
import prisma from '../client';
import { DOT_ADDRESS } from '../event-handlers/__tests__/utils';
import { GetBatchQuery } from '../gql/generated/graphql';
import processBlocks from '../processBlocks';

describe(processBlocks, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "ChainTracking", private."State" CASCADE`;
  });

  it('dispatches a SwapScheduled event', async () => {
    await prisma.swapDepositChannel.create({
      data: {
        depositAddress: DOT_ADDRESS,
        issuedBlock: 100,
        channelId: 250n,
        srcChain: 'Polkadot',
        srcAsset: 'Dot',
        destAsset: 'Btc',
        destAddress: 'bcrt1pzjdpc799qa5f7m65hpr66880res5ac3lr6y2chc4jsa',
        brokerCommissionBps: 0,
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

    const requestSpy = jest
      .spyOn(GraphQLClient.prototype, 'request')
      .mockResolvedValueOnce({
        blocks: {
          nodes: [
            {
              height: 150,
              timestamp: '2024-08-26T00:00:00.000Z',
              hash: '0x6c35d3e08b00e979961976cefc79f9594e8ae12f8cc4e9cabfd4796a1994ccd8',
              specId: 'chainflip-node@0',
              events: {
                nodes: [
                  {
                    name: 'BitcoinChainTracking.ChainStateUpdated',
                    args: {
                      newChainState: {
                        blockHeight: 1000,
                      },
                    },
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
