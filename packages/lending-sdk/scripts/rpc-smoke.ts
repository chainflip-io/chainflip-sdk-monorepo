/**
 * Quick smoke-test against the real Chainflip RPC.
 * Run with:  npx tsx scripts/rpc-smoke.ts
 */
import { LendingSDK } from '../src/index.js';

const stringify = (v: unknown) =>
  JSON.stringify(v, (_, val) => (typeof val === 'bigint' ? val.toString() : val), 2);

const sdk = new LendingSDK({ network: 'mainnet' });

const pools = await sdk.getLendingPools();
// eslint-disable-next-line no-console
console.log("getLendingPools", stringify(pools));

const config = await sdk.getLendingConfig();
// eslint-disable-next-line no-console
console.log("getLendingConfig", stringify(config));

const balances = await sdk.getLendingPoolSupplyBalances();
// eslint-disable-next-line no-console
console.log("getLendingPoolSupplyBalances", stringify(balances));
