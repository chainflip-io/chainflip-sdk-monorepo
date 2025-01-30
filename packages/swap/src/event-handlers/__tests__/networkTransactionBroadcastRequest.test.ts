import { describe, it, expect, beforeEach } from 'vitest';
import {
  networkTransactionBroadcastRequestBtcMock,
  networkTransactionBroadcastRequestBtcMockV2,
} from './utils';
import prisma, { Chain } from '../../client';
import networkTransactionBroadcastRequest from '../networkTransactionBroadcastRequest';

const genericTest = async (chain: Chain, eventType: number) => {
  const mock =
    eventType === 1
      ? networkTransactionBroadcastRequestBtcMock
      : networkTransactionBroadcastRequestBtcMockV2;
  const { block } = mock;
  const { event } = mock.eventContext;

  const broadcastId =
    eventType === 1
      ? networkTransactionBroadcastRequestBtcMock.eventContext.event.args.broadcastAttemptId
          .broadcastId
      : networkTransactionBroadcastRequestBtcMockV2.eventContext.event.args.broadcastId;

  await prisma.broadcast.create({
    data: {
      chain,
      nativeId: broadcastId,
      requestedAt: new Date(block.timestamp),
      requestedBlockIndex: `${block.height - 1}-1`,
    },
  });

  await prisma.$transaction(async (txClient) => {
    await networkTransactionBroadcastRequest(chain)({
      prisma: txClient,
      block: block as any,
      event: event as any,
    });
  });

  const broadcast = await prisma.broadcast.findFirstOrThrow({
    where: { nativeId: broadcastId, chain },
  });

  expect(broadcast.transactionPayload).toEqual(
    JSON.stringify({
      encodedTransaction:
        '0x020000000001012f9fa5bb631cc20b2ee53988549db06369188977a759eeee0e95fe4d9089518b0100000000fdffffff0202ac0e0000000000160014605a08f510309c0aeb52554c288cc8a81e773f0c0c2feb02000000002251203d30a261d370dc764140a8f222bda1d003a403d8a24648470fb2e4fc2978f2ae0340b036f7c1cb7a0cfc00e1984cd49daba01fa7a69eeda00e71c14d7f262668ff72e8b29aa02899df429ca1e304482a7c9f86d6448bc5da3c7da567cef4053d3d92245175206a4d5e4829cf59df788c48223c71abb1c3c57a12bfc9b7d389786c4aca4ba5f7ac21c0eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee00000000',
    }),
  );
  expect(await prisma.broadcast.count()).toEqual(1);
};

describe(networkTransactionBroadcastRequest, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "Broadcast" CASCADE`;
  });

  it('handles Bitcoin event', async () => {
    await genericTest('Bitcoin', 1);
  });
  it('handles Ethereum event', async () => {
    await genericTest('Ethereum', 1);
  });
  it('handles Polkadot event', async () => {
    await genericTest('Polkadot', 1);
  });

  it('handles Bitcoin event', async () => {
    await genericTest('Bitcoin', 2);
  });
  it('handles Ethereum event', async () => {
    await genericTest('Ethereum', 2);
  });
  it('handles Polkadot event', async () => {
    await genericTest('Polkadot', 2);
  });
});
