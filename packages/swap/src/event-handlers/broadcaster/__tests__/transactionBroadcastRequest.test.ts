/* eslint-disable @vitest/expect-expect */
import { ChainflipChain } from '@chainflip/utils/chainflip';
import { describe, it, expect, beforeEach } from 'vitest';
import prisma from '../../../client.js';
import { transactionBroadcastRequestBtcMockV2 } from '../../__tests__/utils.js';
import transactionBroadcastRequest, {
  type TransactionBroadcastRequestArgsMap,
} from '../transactionBroadcastRequest.js';

const genericTest = async <const C extends ChainflipChain>(
  chain: C,
  args: TransactionBroadcastRequestArgsMap[C],
) => {
  const mock = transactionBroadcastRequestBtcMockV2;
  const { block } = mock;
  const { event } = mock.eventContext;

  const { broadcastId } = transactionBroadcastRequestBtcMockV2.eventContext.event.args;

  await prisma.broadcast.create({
    data: {
      chain,
      nativeId: broadcastId,
      requestedAt: new Date(block.timestamp),
      requestedBlockIndex: `${block.height - 1}-1`,
    },
  });

  await prisma.$transaction(async (txClient) => {
    await transactionBroadcastRequest(chain)({
      prisma: txClient,
      block: block as any,
      event: { ...event, args },
    });
  });

  const broadcast = await prisma.broadcast.findFirstOrThrow({
    where: { nativeId: broadcastId, chain },
  });

  expect(broadcast).toMatchSnapshot({
    id: expect.any(BigInt),
    createdAt: expect.any(Date),
    updatedAt: expect.any(Date),
  });
  expect(await prisma.broadcast.count()).toEqual(1);
};

describe(transactionBroadcastRequest, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "Broadcast" CASCADE`;
  });

  it('handles Bitcoin event', async () => {
    await genericTest('Bitcoin', {
      nominee: '0x78ce2b0a2754e8b13b0785bb73675406648a53e1e442b72f7f105f4e28b7697c',
      transactionOutId: '0x6d40ae184678785c43304a28267b85e0bbd8cec9d66f4832607e92bb660d954c',
      broadcastId: 1,
      transactionPayload: {
        encodedTransaction:
          '0x02000000000101cadd87785ee27e64170e60ed6ac4111a6696ea7f84c79ea419918b4e5b4ebc910100000000fdffffff015602c8120000000022512038ebafad5f3105608104b26d7d71a7eb91be8fc97e24a8a9ca96acfe4ce24c4c0340604e0d08924a89a69eb7c6dd1b632f8e18a07b8e4b02a1a74ae5ba167d2b85f0a04af814a06bf27a41cd87918daa27a8048c8926d3ceb922003931e6cdc6eb3e240075201f7866c3ad904ef2c76c4bd337996a21709c13da8abbb615dce5e2e369ade04fac21c0eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee00000000',
      },
    });
  });

  it('handles Ethereum event', async () => {
    await genericTest('Ethereum', {
      nominee: '0x78ce2b0a2754e8b13b0785bb73675406648a53e1e442b72f7f105f4e28b7697c',
      transactionOutId: {
        s: '0x',
        kTimesGAddress: '0x6d40ae184678785c43304a28267b85e0bbd8cec9d66f4832607e92bb660d954c',
      },
      broadcastId: 1,
      transactionPayload: {
        chainId: 1,
        contract: '0x1234',
        value: 0,
        data: '0x02000000000101cadd87785ee27e64170e60ed6ac4111a6696ea7f84c79ea419918b4e5b4ebc910100000000fdffffff015602c8120000000022512038ebafad5f3105608104b26d7d71a7eb91be8fc97e24a8a9ca96acfe4ce24c4c0340604e0d08924a89a69eb7c6dd1b632f8e18a07b8e4b02a1a74ae5ba167d2b85f0a04af814a06bf27a41cd87918daa27a8048c8926d3ceb922003931e6cdc6eb3e240075201f7866c3ad904ef2c76c4bd337996a21709c13da8abbb615dce5e2e369ade04fac21c0eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee00000000',
      },
    });
  });

  it('handles Assethub event', async () => {
    await genericTest('Assethub', {
      nominee: '0x78ce2b0a2754e8b13b0785bb73675406648a53e1e442b72f7f105f4e28b7697c',
      transactionOutId: '0x6d40ae184678785c43304a28267b85e0bbd8cec9d66f4832607e92bb660d954c',
      broadcastId: 1,
      transactionPayload: {
        encodedExtrinsic:
          '0x02000000000101cadd87785ee27e64170e60ed6ac4111a6696ea7f84c79ea419918b4e5b4ebc910100000000fdffffff015602c8120000000022512038ebafad5f3105608104b26d7d71a7eb91be8fc97e24a8a9ca96acfe4ce24c4c0340604e0d08924a89a69eb7c6dd1b632f8e18a07b8e4b02a1a74ae5ba167d2b85f0a04af814a06bf27a41cd87918daa27a8048c8926d3ceb922003931e6cdc6eb3e240075201f7866c3ad904ef2c76c4bd337996a21709c13da8abbb615dce5e2e369ade04fac21c0eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee00000000',
      },
    });
  });
});
