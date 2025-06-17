import { assetConstants, ChainflipAsset } from '@chainflip/utils/chainflip';
import { z } from 'zod';
import env from '../config/env.js';
import { memoize } from '../utils/function.js';

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

export const getBoostSafeMode = async (asset: ChainflipAsset) => {
  const flags = await getFlags();
  const { chain } = assetConstants[asset];
  return flags[`ingressEgress${chain}`]?.boostDepositsEnabled ?? false;
};

export const getInternalSwapNetworkFeeInfo = memoize(
  async (): Promise<{ networkFeeBps: bigint; minimumNetworkFee: bigint }> => {
    const api = await getApi();

    const [feePerMill, minimumNetworkFee] = await Promise.all([
      api.query.swapping.internalSwapNetworkFee().then((codec) => z.number().parse(codec.toJSON())),
      api.query.swapping
        .internalSwapMinimumNetworkFee()
        .then((codec) => z.number().parse(codec.toJSON())),
    ]);

    return {
      networkFeeBps: BigInt(feePerMill / 100),
      minimumNetworkFee: BigInt(minimumNetworkFee),
    };
  },
  60_000,
);
