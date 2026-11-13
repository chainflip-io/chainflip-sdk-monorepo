import { HttpClient } from '@chainflip/rpc';
import { getInternalAsset } from '@chainflip/utils/chainflip';
import { z } from 'zod';
import { getParameterEncodingRequestSchema } from '@/shared/broker.js';
import networkInfo from './networkInfo.js';
import env from '../config/env.js';
import { assertRouteEnabled } from '../utils/env.js';
import logger from '../utils/logger.js';
import { validateSwapAmount } from '../utils/rpc.js';
import ServiceError from '../utils/ServiceError.js';

const brokerClient = new HttpClient(env.RPC_BROKER_HTTPS_URL);

export const encodeCfParameters = async (
  input: z.output<ReturnType<typeof getParameterEncodingRequestSchema>>,
) => {
  logger.info('Encoding CF parameters', input);

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
    'broker_encode_cf_parameters',
    input.srcAsset,
    input.destAsset,
    input.destAddress,
    cfBrokerCommissionBps,
    input.fillOrKillParams,
    input.ccmParams,
    input.maxBoostFeeBps,
    undefined, // swap broker does not support affiliates
    input.dcaParams,
  );

  logger.info('CF parameters encoded', response);

  return response;
};
