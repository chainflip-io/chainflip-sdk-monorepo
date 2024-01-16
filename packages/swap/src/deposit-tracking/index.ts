import { Asset, Chain, Chains } from '@/shared/enums';
import RedisClient from '@/shared/node-apis/redis';
import { fetchPendingBitcoinDeposit } from './bitcoin';
import prisma from '../client';
import env from '../config/env';
import { handleExit } from '../utils/function';

let redis: RedisClient | undefined;

export type PendingDeposit = {
  amount: string;
  transactionHash?: string;
  transactionConfirmations: number;
};

export const getPendingDeposit = async (
  chain: Chain,
  asset: Asset,
  address: string,
): Promise<PendingDeposit | undefined> => {
  if (chain === Chains.Bitcoin) {
    return fetchPendingBitcoinDeposit(address);
  }

  if (!env.REDIS_URL) return undefined;

  if (!redis) {
    redis = new RedisClient(env.REDIS_URL);

    handleExit(() => redis!.quit());
  }

  const [deposits, tracking] = await Promise.all([
    redis.getDeposits(chain, asset, address),
    prisma.chainTracking.findFirst({ where: { chain } }),
  ]);

  if (deposits.length === 0 || tracking == null) return undefined;

  const confirmations =
    tracking.height - BigInt(deposits[0].deposit_chain_block_height);

  return {
    amount: deposits[0].amount.toString(),
    transactionConfirmations: Number(confirmations),
  };
};
