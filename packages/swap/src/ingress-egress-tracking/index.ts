import { Asset, Chain, Chains } from '@/shared/enums';
import RedisClient from '@/shared/node-apis/redis';
import prisma from '../client';
import env from '../config/env';
import { handleExit } from '../utils/function';
import logger from '../utils/logger';

const redis = env.REDIS_URL ? new RedisClient(env.REDIS_URL) : undefined;

if (redis) handleExit(() => redis.quit());

export type PendingDeposit = {
  amount: string;
  transactionHash?: string;
  transactionConfirmations: number;
};

export const getPendingDeposit = async (
  chain: Chain,
  asset: Asset,
  address: string,
): Promise<PendingDeposit | null> => {
  if (!redis) return null;

  try {
    if (chain === Chains.Bitcoin) {
      const tx = await redis.getMempoolTransaction('Bitcoin', address);

      if (tx) {
        return {
          amount: tx.value,
          transactionConfirmations: tx.confirmations,
          transactionHash: tx.tx_hash,
        };
      }
    }

    const [deposits, tracking] = await Promise.all([
      redis.getDeposits(chain, asset, address),
      prisma.chainTracking.findFirst({ where: { chain } }),
    ]);

    if (deposits.length === 0 || tracking == null) return null;

    const confirmations =
      tracking.height - BigInt(deposits[0].deposit_chain_block_height);

    return {
      amount: deposits[0].amount.toString(),
      transactionConfirmations: Number(confirmations),
    };
  } catch (error) {
    logger.error('error while looking up deposit in redis', { error });
    return null;
  }
};

export const getPendingBroadcast = async (
  chain: Chain,
  broadcastId: bigint,
) => {
  if (!redis) return null;
  try {
    return await redis.getBroadcast(chain, broadcastId);
  } catch (error) {
    logger.error('error while looking up broadcast in redis', { error });
    return null;
  }
};
