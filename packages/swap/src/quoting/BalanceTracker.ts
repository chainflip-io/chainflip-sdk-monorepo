import { InternalAssetMap } from '@chainflip/utils/chainflip';
import { inspect } from 'util';
import type { AccountId } from './Quoter.js';
import baseLogger from '../utils/logger.js';
import { getLpBalances } from '../utils/rpc.js';

const logger = baseLogger.child({ module: 'balance-tracker' });

export default class BalanceTracker {
  private monitoredAccounts = new Set<AccountId>();

  private balances = Promise.resolve(new Map<AccountId, InternalAssetMap<bigint>>());

  private lastUpdate = 0;

  private inflightCount = 0;

  constructor(private readonly active: boolean = true) {}

  add(account: AccountId) {
    if (!this.active) return;
    this.monitoredAccounts.add(account);
    this.refresh();
  }

  remove(account: AccountId) {
    this.monitoredAccounts.delete(account);
  }

  async getBalances() {
    if (this.lastUpdate < Date.now() - 10_000 && this.inflightCount === 0) {
      await this.refresh();
    }

    while (this.inflightCount > 0) await this.balances;

    return this.balances;
  }

  private async refresh(): Promise<void> {
    if (this.monitoredAccounts.size === 0) return;

    this.inflightCount += 1;

    const { promise, resolve } = Promise.withResolvers<Map<AccountId, InternalAssetMap<bigint>>>();

    this.balances = promise.finally(() => {
      this.inflightCount -= 1;
    });

    for (let i = 0; i < 5; i += 1) {
      try {
        const balances = new Map(await getLpBalances(this.monitoredAccounts));
        this.lastUpdate = Date.now();
        resolve(balances);
        return;
      } catch (error) {
        logger.warn('failed to get balances', { error: inspect(error) });
      }
    }

    logger.error('failed to get balances after 5 attempts');

    resolve(new Map());
  }
}
