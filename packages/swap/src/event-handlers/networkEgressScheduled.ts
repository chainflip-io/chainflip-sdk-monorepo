import { z } from 'zod';
import { assetToChain } from '@/shared/enums';
import { unsignedInteger, stateChainAssetEnum } from '@/shared/parsers';
import logger from '../utils/logger';
import { egressId } from './common';
import type { EventHandlerArgs } from '.';

const eventArgs = z.object({
  id: egressId,
  asset: stateChainAssetEnum,
  amount: unsignedInteger,
});

/**
 * the event emits the egress id (Network, number) and the egress amount. the
 * egress id is used to uniquely identify an egress and correlate it to a swap
 * and determining if funds were successfully sent by the broadcast pallets
 */
export default async function networkEgressScheduled({
  prisma,
  block,
  event,
}: EventHandlerArgs): Promise<void> {
  try {
    const { id, asset, amount } = eventArgs.parse(event.args);

    await prisma.egress.create({
      data: {
        nativeId: id[1],
        chain: assetToChain[asset],
        amount: amount.toString(),
        timestamp: new Date(block.timestamp),
      },
    });
  } catch (error) {
    logger.customError(
      'error in "chainEgressScheduled" handler',
      { alertCode: 'EventHandlerError' },
      { error, handler: 'chainEgressScheduled' },
    );
    throw error;
  }
}
