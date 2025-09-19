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
