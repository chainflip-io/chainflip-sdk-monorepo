import { InternalAsset } from '@/shared/enums';
import ServiceError from './ServiceError';
import env from '../config/env';

export const isLocalnet = () => env.CHAINFLIP_NETWORK === 'backspin';

export const assertRouteEnabled = ({
  srcAsset,
  destAsset,
}: {
  srcAsset: InternalAsset;
  destAsset: InternalAsset;
}) => {
  if (
    env.FULLY_DISABLED_INTERNAL_ASSETS.includes(srcAsset) ||
    env.DISABLED_DEPOSIT_INTERNAL_ASSETS.includes(srcAsset)
  ) {
    throw ServiceError.unavailable(`Asset ${srcAsset} is disabled`);
  }

  if (
    env.FULLY_DISABLED_INTERNAL_ASSETS.includes(destAsset) ||
    env.DISABLED_DESTINATION_INTERNAL_ASSETS.includes(destAsset)
  ) {
    throw ServiceError.unavailable(`Asset ${destAsset} is disabled`);
  }
};
