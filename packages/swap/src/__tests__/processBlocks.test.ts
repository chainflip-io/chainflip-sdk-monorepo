import { GraphQLClient } from 'graphql-request';
import prisma from '../client';
import { swapScheduledDepositChannelMock } from '../event-handlers/__tests__/utils';
import { GetBatchQuery } from '../gql/generated/graphql';
import processBlocks from '../processBlocks';

describe(processBlocks, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", "Swap", private."State" CASCADE`;
  });

  it('dispatches a SwapScheduled event', async () => {
    const depositAddress =
      swapScheduledDepositChannelMock.eventContext.event.args.origin
        .depositAddress.value;

    await prisma.swapDepositChannel.create({
      data: {
        depositAddress,
        issuedBlock: 100,
        expiryBlock: 200,
        srcAsset: 'ETH',
        destAsset: 'USDC',
        destAddress: '0xdeadbeef',
        expectedDepositAmount: '1000000000000000000',
      },
    });

    const requestSpy = jest
      .spyOn(GraphQLClient.prototype, 'request')
      .mockResolvedValueOnce({
        blocks: {
          nodes: [
            {
              height: 1,
              timestamp: 1681989543437,
              events: {
                nodes: [swapScheduledDepositChannelMock.eventContext.event],
              },
            },
          ],
        },
      } as GetBatchQuery)
      // terminate the loop
      .mockRejectedValue(Error('clean exit'));

    await expect(processBlocks()).rejects.toThrowError('clean exit');
    expect(requestSpy).toHaveBeenCalledTimes(2);
    const swaps = await prisma.swap.findMany();
    expect(swaps).toHaveLength(1);
    expect(swaps[0]).toMatchInlineSnapshot(
      {
        id: expect.any(BigInt),
        swapDepositChannelId: expect.any(BigInt),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      },
      `
      {
        "createdAt": Any<Date>,
        "depositAmount": "222222222222222222",
        "depositReceivedAt": 2023-04-20T11:19:03.437Z,
        "depositReceivedBlockIndex": "1-0",
        "destAddress": "0xdeadbeef",
        "destAsset": "USDC",
        "egressCompletedAt": null,
        "egressCompletedBlockIndex": null,
        "id": Any<BigInt>,
        "nativeId": 9876545n,
        "srcAsset": "ETH",
        "swapDepositChannelId": Any<BigInt>,
        "swapExecutedAt": null,
        "swapExecutedBlockIndex": null,
        "updatedAt": Any<Date>,
      }
    `,
    );
  });
});
