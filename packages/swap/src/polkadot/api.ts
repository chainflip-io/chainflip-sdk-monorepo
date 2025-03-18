import { z } from 'zod';
import { InternalAsset, getAssetAndChain } from '@/shared/enums';
import env from '../config/env';
import { memoize } from '../utils/function';

const boostFlagsSchema = z.object({ boostDepositsEnabled: z.boolean() });

export const boostSafeModeSchema = z.object({
  ingressEgressEthereum: boostFlagsSchema,
  ingressEgressBitcoin: boostFlagsSchema,
  ingressEgressPolkadot: boostFlagsSchema,
  ingressEgressArbitrum: boostFlagsSchema,
  ingressEgressSolana: boostFlagsSchema,
  ingressEgressAssethub: boostFlagsSchema.optional(),
});

const getApi = memoize(async () => {
  const { WsProvider, ApiPromise } = await import('@polkadot/api');

  return (await ApiPromise.create({ provider: new WsProvider(env.RPC_NODE_WSS_URL) })).isReady;
});

const getFlags = memoize(async () => {
  const api = await getApi();

  return boostSafeModeSchema.parse((await api.query.environment.runtimeSafeMode()).toJSON());
}, 60_000);

export const getBoostSafeMode = async (asset: InternalAsset) => {
  const flags = await getFlags();
  const { chain } = getAssetAndChain(asset);
  return flags[`ingressEgress${chain}`]?.boostDepositsEnabled ?? false;
};
