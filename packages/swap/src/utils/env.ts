import { ChainflipAsset } from '@chainflip/utils/chainflip';
import ServiceError from './ServiceError.js';
import env from '../config/env.js';

export const isLocalnet = () => env.CHAINFLIP_NETWORK === 'backspin';

export const assertRouteEnabled = ({
  srcAsset,
  destAsset,
}: {
  srcAsset: ChainflipAsset;
  destAsset: ChainflipAsset;
}) => {
  if (
    env.FULLY_DISABLED_INTERNAL_ASSETS.has(srcAsset) ||
    env.DISABLED_DEPOSIT_INTERNAL_ASSETS.has(srcAsset)
  ) {
    throw ServiceError.unavailable(`Asset ${srcAsset} is disabled`);
  }

  if (
    env.FULLY_DISABLED_INTERNAL_ASSETS.has(destAsset) ||
    env.DISABLED_DESTINATION_INTERNAL_ASSETS.has(destAsset)
  ) {
    throw ServiceError.unavailable(`Asset ${destAsset} is disabled`);
  }
};

export const assertBrokerConditions = ({
  brokerAccount,
  affiliates,
  commissionBps,
}: {
  brokerAccount?: string;
  affiliates?: unknown[];
  commissionBps: number;
}) => {
  if (brokerAccount) {
    if (env.RESERVED_BROKER_ACCOUNTS.has(brokerAccount))
      throw ServiceError.badRequest(`broker account ${brokerAccount} is not allowed`);
    return;
  }
  if (affiliates?.length)
    throw ServiceError.badRequest('setting affiliates requires a brokerAccount');
  if (commissionBps !== env.BROKER_COMMISSION_BPS) {
    throw ServiceError.badRequest(
      `broker commission must be ${env.BROKER_COMMISSION_BPS} bps, please upgrade the sdk and request a new quote`,
    );
  }
};
