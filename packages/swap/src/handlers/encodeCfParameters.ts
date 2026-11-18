import { HttpClient } from '@chainflip/rpc';
import { getInternalAsset } from '@chainflip/utils/chainflip';
import { z } from 'zod';
import { getParameterEncodingRequestSchema } from '@/shared/broker.js';
import env from '../config/env.js';
import {
  assertBrokerAccountAllowed,
  assertBrokerCommission,
  assertRouteEnabled,
} from '../utils/env.js';
import logger from '../utils/logger.js';
import { validateSwapAmount } from '../utils/rpc.js';
import ServiceError from '../utils/ServiceError.js';

const brokerClient = new HttpClient(env.RPC_BROKER_HTTPS_URL);
const nodeClient = new HttpClient(env.RPC_NODE_HTTP_URL);

export const encodeCfParameters = async (
  input: z.output<ReturnType<typeof getParameterEncodingRequestSchema>>,
) => {
  logger.info('Encoding CF parameters', input);

  if (input.brokerAccount) {
    assertBrokerAccountAllowed(input.brokerAccount);
  } else {
    if (input.affiliates?.length) {
      throw ServiceError.badRequest('setting affiliates requires a brokerAccount');
    }
    assertBrokerCommission(input.commissionBps);
  }

  const srcAsset = getInternalAsset(input.srcAsset);
  const destAsset = getInternalAsset(input.destAsset);
  assertRouteEnabled({ srcAsset, destAsset });

  const result = await validateSwapAmount(srcAsset, BigInt(input.amount));

  if (!result.success) throw ServiceError.badRequest(result.reason);

  // with a brokerAccount, the node only encodes the payload and the swap is attributed to that
  // account. our broker is not involved
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
        env.BROKER_COMMISSION_BPS,
        input.fillOrKillParams,
        input.ccmParams,
        input.maxBoostFeeBps,
        undefined, // swap broker does not support affiliates
        input.dcaParams,
      );

  logger.info('CF parameters encoded', response);

  return response;
};
