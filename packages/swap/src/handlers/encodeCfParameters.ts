import { HttpClient } from '@chainflip/rpc';
import { getInternalAsset } from '@chainflip/utils/chainflip';
import { z } from 'zod';
import { getParameterEncodingRequestSchema } from '@/shared/broker.js';
import env from '../config/env.js';
import { assertRouteEnabled } from '../utils/env.js';
import logger from '../utils/logger.js';
import { validateSwapAmount } from '../utils/rpc.js';
import ServiceError from '../utils/ServiceError.js';

const brokerClient = new HttpClient(env.RPC_BROKER_HTTPS_URL);
const nodeClient = new HttpClient(env.RPC_NODE_HTTP_URL);

export const encodeCfParameters = async (
  input: z.output<ReturnType<typeof getParameterEncodingRequestSchema>>,
) => {
  logger.info('Encoding CF parameters', input);

  const srcAsset = getInternalAsset(input.srcAsset);
  const destAsset = getInternalAsset(input.destAsset);
  assertRouteEnabled({ srcAsset, destAsset });

  const result = await validateSwapAmount(srcAsset, BigInt(input.amount));

  if (!result.success) throw ServiceError.badRequest(result.reason);

  const response = input.brokerAccount
    ? await nodeClient.sendRequest(
        'cf_encode_cf_parameters',
        input.brokerAccount,
        input.srcAsset,
        input.destAsset,
        input.destAddress,
        input.commissionBps,
        input.fillOrKillParams,
        input.ccmParams,
        input.maxBoostFeeBps,
        input.affiliates,
        input.dcaParams,
      )
    : await brokerClient.sendRequest(
        'broker_encode_cf_parameters',
        input.srcAsset,
        input.destAsset,
        input.destAddress,
        0, // default broker account does not support commission
        input.fillOrKillParams,
        input.ccmParams,
        input.maxBoostFeeBps,
        undefined, // default broker account does not support affiliates
        input.dcaParams,
      );

  logger.info('Vault swap data fetched', response);

  return response;
};
