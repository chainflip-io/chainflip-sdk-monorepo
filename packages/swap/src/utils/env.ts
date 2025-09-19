import { ChainflipAsset } from '@chainflip/utils/chainflip';
import ServiceError from './ServiceError.js';
import env from '../config/env.js';

export const isLocalnet = () => env.CHAINFLIP_NETWORK === 'backspin';

const DISABLE_ASSET: ChainflipAsset = 'Dot';

export const assertRouteEnabled = ({
  srcAsset,
  destAsset,
}: {
  srcAsset: ChainflipAsset;
  destAsset: ChainflipAsset;
}) => {
  if (
    env.FULLY_DISABLED_INTERNAL_ASSETS.has(srcAsset) ||
    env.DISABLED_DEPOSIT_INTERNAL_ASSETS.has(srcAsset) ||
    DISABLE_ASSET === srcAsset
  ) {
    throw ServiceError.unavailable(`Asset ${srcAsset} is disabled`);
  }

  if (
    env.FULLY_DISABLED_INTERNAL_ASSETS.has(destAsset) ||
    env.DISABLED_DESTINATION_INTERNAL_ASSETS.has(destAsset) ||
    DISABLE_ASSET === destAsset
  ) {
    throw ServiceError.unavailable(`Asset ${destAsset} is disabled`);
  }
};
