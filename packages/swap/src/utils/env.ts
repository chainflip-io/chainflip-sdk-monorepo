import env from '../config/env';

export const isLocalnet = () => env.CHAINFLIP_NETWORK === 'backspin';
