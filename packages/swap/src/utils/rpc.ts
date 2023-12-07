import { UncheckedAssetAndChain } from '@/shared/enums';
import { getSwappingEnvironment } from '@/shared/rpc';
import { validateSwapAmount as validateAmount } from '@/shared/rpc/utils';
import { memoize } from './function';

const cachedGetSwappingEnvironment = memoize(getSwappingEnvironment, 60_000);

type Result = { success: true } | { success: false; reason: string };

export const validateSwapAmount = async (
  asset: UncheckedAssetAndChain,
  amount: bigint,
): Promise<Result> => {
  const swapEnv = await cachedGetSwappingEnvironment({
    rpcUrl: process.env.RPC_NODE_HTTP_URL as string,
  });

  return validateAmount(swapEnv, asset, amount);
};
