import { HttpClient } from '@chainflip/rpc';
import { getInternalAsset } from '@chainflip/utils/chainflip';
import { z } from 'zod';
import { getVaultSwapParameterEncodingRequestSchema } from '@/shared/broker.js';
import { transformKeysToCamelCase } from '@/shared/objects.js';
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

export const encodeVaultSwapData = async (
  input: z.output<ReturnType<typeof getVaultSwapParameterEncodingRequestSchema>>,
) => {
  logger.info('Fetching vault swap data', input);

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
        env.BROKER_COMMISSION_BPS,
        input.extraParams,
        input.ccmParams,
        input.maxBoostFeeBps,
        undefined, // swap broker does not support affiliates
        input.dcaParams,
      );

  logger.info('Vault swap data fetched', response);

  return transformKeysToCamelCase(response);
};
