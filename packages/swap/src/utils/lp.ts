import { AsyncCacheMap, MultiCache } from '@/shared/dataStructures.js';
import { getAccountInfo, getAccounts } from './rpc.js';
import prisma from '../client.js';
import logger from './logger.js';

const accountInfo = new AsyncCacheMap({
  fetch: (idSs58: string) => getAccountInfo(idSs58),
  resetExpiryOnLookup: false,
  ttl: 60_000,
});

const cache = new MultiCache({
  accounts: { fetch: getAccounts, ttl: 30_000 },
  marketMakers: { fetch: () => prisma.marketMaker.findMany(), ttl: 30_000 },
});

export const getJITLpAccounts = async () => {
  const [accounts, jitMarketMakers] = await Promise.all([
    cache.read('accounts'),
    cache.read('marketMakers'),
  ]);

  const marketMakers = new Set(jitMarketMakers.map((mm) => mm.name));
  const jitAccounts = accounts.filter((account) => marketMakers.has(account.idSs58));

  const accountsWithInfo = await Promise.all(
    jitAccounts.map(async (account) => accountInfo.get(account.idSs58)),
  );

  const jitLpAccounts = accountsWithInfo.filter(
    (account) => account?.role === 'liquidity_provider',
  );

  if (!jitLpAccounts.length) {
    logger.warn('Did not find any JIT accounts');
  }
  return jitLpAccounts;
};
