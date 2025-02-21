import { HttpClient } from '@chainflip/rpc';
import { z } from 'zod';
import { getParameterEncodingRequestSchema } from '@/shared/broker';
import { getInternalAsset } from '@/shared/enums';
import { transformKeysToCamelCase } from '@/shared/objects';
import { chainflipAddress } from '@/shared/parsers';
import env from '../config/env';
import { assertRouteEnabled } from '../utils/env';
import isDisallowedSwap from '../utils/isDisallowedSwap';
import logger from '../utils/logger';
import { validateSwapAmount } from '../utils/rpc';
import ServiceError from '../utils/ServiceError';

const brokerClient = new HttpClient(env.RPC_BROKER_HTTPS_URL);
const nodeClient = new HttpClient(env.RPC_NODE_HTTP_URL);

export const encodeVaultSwapDataSchema = getParameterEncodingRequestSchema(
  env.CHAINFLIP_NETWORK,
).and(
  z.object({
    brokerAccount: chainflipAddress.optional(),
  }),
);

export const encodeVaultSwapData = async (input: z.output<typeof encodeVaultSwapDataSchema>) => {
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
  const destAsset = getInternalAsset(input.destAsset);
  assertRouteEnabled({ srcAsset, destAsset });

  const result = await validateSwapAmount(srcAsset, BigInt(input.amount));

  if (!result.success) throw ServiceError.badRequest(result.reason);

  const response = input.brokerAccount
    ? await nodeClient.sendRequest(
        'cf_request_swap_parameter_encoding',
        input.brokerAccount,
        input.srcAsset,
        input.destAsset,
        input.destAddress,
        input.commissionBps,
        input.extraParams,
        input.ccmParams,
        input.maxBoostFeeBps,
        input.affiliates,
        input.dcaParams,
      )
    : await brokerClient.sendRequest(
        'broker_request_swap_parameter_encoding',
        input.srcAsset,
        input.destAsset,
        input.destAddress,
        0, // default broker account does not support commission
        input.extraParams,
        input.ccmParams,
        input.maxBoostFeeBps,
        undefined, // default broker account does not support affiliates
        input.dcaParams,
      );

  logger.info('Vault swap data fetched', response);

  return transformKeysToCamelCase(response);
};
