import { HttpClient } from '@chainflip/rpc';
import { z } from 'zod';
import { getParameterEncodingRequestSchema } from '@/shared/broker';
import { getInternalAsset } from '@/shared/enums';
import { validateAddress } from '@/shared/validation/addressValidation';
import env from '../config/env';
import disallowChannel from '../utils/disallowChannel';
import logger from '../utils/logger';
import { validateSwapAmount } from '../utils/rpc';
import ServiceError from '../utils/ServiceError';

const client = new HttpClient(env.RPC_BROKER_HTTPS_URL);

export const getVaultSwapData = async (
  input: z.output<ReturnType<typeof getParameterEncodingRequestSchema>>,
) => {
  if (!validateAddress(input.destAsset.chain, input.destAddress, env.CHAINFLIP_NETWORK)) {
    throw ServiceError.badRequest(
      `Address "${input.destAddress}" is not a valid "${input.destAsset.chain}" address`,
    );
  }

  if (
    await disallowChannel(
      input.destAddress,
      input.srcAddress,
      input.fillOrKillParams?.refund_address,
    )
  ) {
    logger.info('Blocked address found for vault swap data', input);
    throw ServiceError.internalError('Failed to get vault swap data, please try again later');
  }

  logger.info('Fetching vault swap data', input);

  const srcAsset = getInternalAsset(input.srcAsset);
  const destAsset = getInternalAsset(input.destAsset);
  if (env.DISABLED_INTERNAL_ASSETS.includes(srcAsset)) {
    throw ServiceError.unavailable(`Asset ${srcAsset} is disabled`);
  }
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
    0, // use fixed commission for default broker
    input.extraParams,
    input.ccmParams,
    input.maxBoostFeeBps,
    undefined, // use fixed affiliates for default broker
    input.dcaParams,
  );

  logger.info('Vault swap data fetched', response);

  return response;
};
