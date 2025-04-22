import { AsyncCacheMap } from '@/shared/dataStructures.js';
import { getAccountInfo, getAccounts } from './rpc.js';

const accountInfo = new AsyncCacheMap({
  fetch: (idSs58: string) => getAccountInfo(idSs58),
  resetExpiryOnLookup: false,
  ttl: 60_000,
});

export const getLpAccounts = async () => {
  const accounts = await getAccounts();

  const accountsWithInfo = await Promise.all(
    accounts.map(async (account) => accountInfo.get(account.idSs58)),
  );
  return accountsWithInfo.filter((account) => account.role === 'liquidity_provider');
};
