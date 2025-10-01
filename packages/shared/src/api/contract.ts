import { initContract } from '@ts-rest/core';
import { CfParameterEncodingRequestWithBroker } from './encodeCfParameters.js';
import { EncodedVaultSwapData, EncodeVaultSwapBody } from './encodeVaultSwapData.js';
import { NetworkInfo } from './networkInfo.js';
import { DepositChannelInfo, OpenSwapDepositChannelBody } from './openSwapDepositChannel.js';
import { hexString } from '../parsers.js';

const c = initContract();

export const apiContract = c.router(
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
      body: CfParameterEncodingRequestWithBroker,
      responses: {
        200: hexString,
      },
    },
    encodeVaultSwapData: {
      method: 'POST',
      path: '/encodeVaultSwapData',
      body: EncodeVaultSwapBody,
      responses: {
        200: EncodedVaultSwapData,
      },
    },
    openSwapDepositChannel: {
      method: 'POST',
      path: '/openSwapDepositChannel',
      body: OpenSwapDepositChannelBody,
      responses: {
        201: DepositChannelInfo,
      },
    },
  },
  {
    pathPrefix: '/api',
  },
);
