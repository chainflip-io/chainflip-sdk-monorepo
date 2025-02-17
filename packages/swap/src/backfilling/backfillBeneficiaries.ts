import { assert } from '@chainflip/utils/assertion';
import { sleep } from '@chainflip/utils/async';
import { GraphQLClient } from 'graphql-request';
import z from 'zod';
import { assetConstants } from '@/shared/enums';
import { accountId, internalAssetEnum, u128 } from '@/shared/parsers';
import prisma from '../client';
import env from '../config/env';
import { GetBlockQuery } from '../gql/generated/graphql';
import { GET_BLOCK } from '../gql/query';
import logger from '../utils/logger';

const client = new GraphQLClient(env.INGEST_GATEWAY_URL);
const signatureSchema = z.object({
  address: z.object({
    value: accountId,
    __kind: z.literal('Id'),
  }),
});

const eventSchema = z.object({ channelId: u128, sourceAsset: internalAssetEnum });

type Event = NonNullable<GetBlockQuery['blocks']>['nodes'][number]['events']['nodes'][number];

const parseChannelArgs = (events: Event[]) =>
  events.map((e) => {
    const result = eventSchema.parse(e.args);

    return {
      channelId: result.channelId,
      sourceChain: assetConstants[result.sourceAsset].chain,
      submitter: signatureSchema.parse(e.extrinsic?.signature).address.value,
    };
  });

export default async function backfillBeneficiaries() {
  if (!env.BACKFILL_BENEFICIARIES) {
    logger.info('not backfilling beneficiaries');
    return;
  }

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const beneficiaries = await prisma.swapBeneficiary.findMany({
      where: { account: '', type: 'SUBMITTER', channelId: { not: null } },
      take: 100,
      include: { channel: true },
    });

    logger.info('got batch of beneficiaries to backfill', { count: beneficiaries.length });

    if (beneficiaries.length === 0) return;

    const channelsByBlock = Map.groupBy(
      beneficiaries.map((b) => {
        assert(b.channel, 'channel not found on beneficiary');
        return {
          channelId: b.channel.channelId,
          issuedBlock: b.channel.issuedBlock,
          srcChain: b.channel.srcChain,
          submitterId: b.id,
        };
      }),
      (channel) => channel.issuedBlock,
    );

    for (const [issuedBlock, channels] of channelsByBlock.entries()) {
      logger.info('backfilling beneficiaries for block', {
        block: issuedBlock,
        count: channels.length,
      });

      const batch = await client.request(GET_BLOCK, {
        height: issuedBlock,
        swapEvents: ['Swapping.SwapDepositAddressReady'],
      });

      const block = batch.blocks?.nodes[0];
      assert(block, 'block not found');

      const parsed = parseChannelArgs(block.events.nodes);

      for (const channel of channels) {
        const data = parsed.find(
          (d) => d.channelId === channel.channelId && d.sourceChain === channel.srcChain,
        );

        assert(data, 'data not found for channel');

        await prisma.swapBeneficiary.update({
          where: { id: channel.submitterId },
          data: { account: data.submitter },
        });
      }
    }

    await sleep(env.BACKFILL_BENEFICIARIES_INTERVAL);
  }
}
