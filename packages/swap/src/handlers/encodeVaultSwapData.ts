import { HttpClient } from '@chainflip/rpc';
import { getInternalAsset } from '@chainflip/utils/chainflip';
import { z } from 'zod';
import { getVaultSwapParameterEncodingRequestSchema } from '@/shared/broker.js';
import { transformKeysToCamelCase } from '@/shared/objects.js';
import networkInfo from './networkInfo.js';
import env from '../config/env.js';
import { assertRouteEnabled } from '../utils/env.js';
import logger from '../utils/logger.js';
import { validateSwapAmount } from '../utils/rpc.js';
import ServiceError from '../utils/ServiceError.js';

const brokerClient = new HttpClient(env.RPC_BROKER_HTTPS_URL);

export const encodeVaultSwapData = async (
  input: z.output<ReturnType<typeof getVaultSwapParameterEncodingRequestSchema>>,
) => {
  logger.info('Fetching vault swap data', input);

  // TODO: move check into zod schema
  if (input.brokerAccount) {
    throw ServiceError.badRequest('setting brokerAccount is not supported');
  }

  const srcAsset = getInternalAsset(input.srcAsset);
  const destAsset = getInternalAsset(input.destAsset);
  assertRouteEnabled({ srcAsset, destAsset });

  const result = await validateSwapAmount(srcAsset, BigInt(input.amount));

  if (!result.success) throw ServiceError.badRequest(result.reason);

  const { cfBrokerCommissionBps } = await networkInfo();

  const response = await brokerClient.sendRequest(
    'broker_request_swap_parameter_encoding',
    input.srcAsset,
    input.destAsset,
    input.destAddress,
    cfBrokerCommissionBps,
    input.extraParams,
    input.ccmParams,
    input.maxBoostFeeBps,
    undefined, // swap broker does not support affiliates
    input.dcaParams,
  );

  logger.info('Vault swap data fetched', response);

  return transformKeysToCamelCase(response);
};
