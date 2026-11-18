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

// Our own broker accounts can't be passed as `brokerAccount`. Otherwise anyone could encode vault
// swaps attributed to us with an arbitrary (or zero) commission
export const assertBrokerAccountAllowed = (brokerAccount: string) => {
  if (env.RESERVED_BROKER_ACCOUNTS.has(brokerAccount)) {
    throw ServiceError.badRequest(`broker account ${brokerAccount} is not allowed`);
  }
};

// Sending the swap broker's commission is the explicit opt-in to the swap.chainflip.io broker.
// Older SDKs quoted without the broker commission and send 0, so rejecting a mismatch stops them
// from silently defaulting to our broker with a fee their quote didn't show.
export const assertBrokerCommission = (commissionBps: number) => {
  if (commissionBps !== env.BROKER_COMMISSION_BPS) {
    throw ServiceError.badRequest(
      `broker commission must be ${env.BROKER_COMMISSION_BPS} bps, please upgrade the sdk and request a new quote`,
    );
  }
};
