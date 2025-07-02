import { initContract } from '@ts-rest/core';
import { CfParameterEncodingRequestWithBroker } from './encodeCfParameters.js';
import { EncodedVaultSwapData, EncodeVaultSwapBody } from './encodeVaultSwapData.js';
import { NetworkStatus } from './networkStatus.js';
import { DepositChannelInfo, OpenSwapDepositChannelBody } from './openSwapDepositChannel.js';
import { hexString } from '../parsers.js';

const c = initContract();

export const apiContract = c.router(
  {
    networkStatus: {
      method: 'GET',
      path: '/networkStatus',
      responses: {
        200: NetworkStatus,
      },
      summary: 'Get information about the Chainflip network',
    },
    encodeCfParameters: {
      method: 'POST',
      path: '/encodeVaultSwapData',
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
