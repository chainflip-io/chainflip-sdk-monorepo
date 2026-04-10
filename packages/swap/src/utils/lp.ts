import { AsyncCacheMap, MultiCache } from '@/shared/dataStructures.js';
import { getAccountInfo, getAccounts } from './rpc.js';
import prisma from '../client.js';
import logger from './logger.js';
import env from '../config/env.js';

const accountInfo = new AsyncCacheMap({
  fetch: (idSs58: string) => getAccountInfo(idSs58),
  resetExpiryOnLookup: false,
  ttl: 60_000,
});

const cache = new MultiCache({
  accounts: { fetch: getAccounts, ttl: 30_000 },
  marketMakers: { fetch: () => prisma.marketMaker.findMany(), ttl: 30_000 },
});

export const getLpAccounts = async () => {
  const accounts = await cache.read('accounts');

  let chosenAccounts = accounts;

  if (!env.CHECK_ALL_LPS_FOR_LIQUIDITY) {
    const jitMarketMakers = await cache.read('marketMakers');
    const marketMakers = new Set(jitMarketMakers.map((mm) => mm.name));
    chosenAccounts = accounts.filter((account) => marketMakers.has(account.idSs58));
  }

  const accountsWithInfo = await Promise.all(
    chosenAccounts.map(async (account) => accountInfo.get(account.idSs58)),
  );

  if (!env.CHECK_ALL_LPS_FOR_LIQUIDITY && chosenAccounts.length === 0) {
    logger.warn('Did not find any JIT accounts');
    return [];
  }

  return accountsWithInfo.filter((account) => account?.role === 'liquidity_provider');
};
