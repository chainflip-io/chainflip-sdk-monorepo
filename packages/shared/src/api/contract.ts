import { ChainflipNetwork } from '@chainflip/utils/chainflip';
import { initContract } from '@ts-rest/core';
import { EncodedVaultSwapData } from './encodeVaultSwapData.js';
import { NetworkInfo } from './networkInfo.js';
import { DepositChannelInfo, getOpenSwapDepositChannelSchema } from './openSwapDepositChannel.js';
import {
  getParameterEncodingRequestSchema,
  getVaultSwapParameterEncodingRequestSchema,
} from '../broker.js';
import { hexString } from '../parsers.js';
import { getAccountCreationDepositChannelSchema } from './openAccountCreationDepositChannel.js';

const c = initContract();

export const createApiContract = (network: ChainflipNetwork) =>
  c.router(
    {
      networkInfo: {
        method: 'GET',
        path: '/networkInfo',
        responses: {
          200: NetworkInfo,
        },
        summary: 'Get information about the Chainflip network',
      },
      encodeCfParameters: {
        method: 'POST',
        path: '/encodeCfParameters',
        body: getParameterEncodingRequestSchema(network),
        responses: {
          200: hexString,
        },
      },
      encodeVaultSwapData: {
        method: 'POST',
        path: '/encodeVaultSwapData',
        body: getVaultSwapParameterEncodingRequestSchema(network),
        responses: {
          200: EncodedVaultSwapData,
        },
      },
      openSwapDepositChannel: {
        method: 'POST',
        path: '/openSwapDepositChannel',
        body: getOpenSwapDepositChannelSchema(network),
        responses: {
          201: DepositChannelInfo,
        },
      },
      openAccountCreationDepositChannel: {
        method: 'POST',
        path: '/openAccountCreationDepositChannel',
        body: getAccountCreationDepositChannelSchema(network),
        responses: {
          201: DepositChannelInfo,
        },
      },
    },
    {
      pathPrefix: '/api',
    },
  );
