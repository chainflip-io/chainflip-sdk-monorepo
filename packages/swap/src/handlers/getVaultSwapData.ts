import { HttpClient } from '@chainflip/rpc';
import { z } from 'zod';
import { getParameterEncodingRequestSchema } from '@/shared/broker';
import { getInternalAsset } from '@/shared/enums';
import { transformKeysToCamelCase } from '@/shared/objects';
import env from '../config/env';
import isDisallowedSwap from '../utils/isDisallowedSwap';
import logger from '../utils/logger';
import { validateSwapAmount } from '../utils/rpc';
import ServiceError from '../utils/ServiceError';

const client = new HttpClient(env.RPC_BROKER_HTTPS_URL);

export const getVaultSwapData = async (
  input: z.output<ReturnType<typeof getParameterEncodingRequestSchema>>,
) => {
  logger.info('Fetching vault swap data', input);

  if (
    await isDisallowedSwap(
      input.destAddress,
      input.srcAddress,
      input.fillOrKillParams?.refund_address,
    )
  ) {
    logger.info('Blocked address found for vault swap data', input);
    throw ServiceError.internalError('Failed to get vault swap data, please try again later');
  }

  const srcAsset = getInternalAsset(input.srcAsset);
  if (env.DISABLED_INTERNAL_ASSETS.includes(srcAsset)) {
    throw ServiceError.unavailable(`Asset ${srcAsset} is disabled`);
  }

  const destAsset = getInternalAsset(input.destAsset);
  if (env.DISABLED_INTERNAL_ASSETS.includes(destAsset)) {
    throw ServiceError.unavailable(`Asset ${destAsset} is disabled`);
  }

  const result = await validateSwapAmount(srcAsset, BigInt(input.amount));

  if (!result.success) throw ServiceError.badRequest(result.reason);

  const response = await client.sendRequest(
    'broker_request_swap_parameter_encoding',
    input.srcAsset,
    input.destAsset,
    input.destAddress,
    0, // default broker does not support commission
    input.extraParams,
    input.ccmParams,
    input.maxBoostFeeBps,
    undefined, // default broker does not support affiliates
    input.dcaParams,
  );

  logger.info('Vault swap data fetched', response);

  return transformKeysToCamelCase(response);
};
