import { ChainflipNetwork } from '@chainflip/utils/chainflip';
import { z } from 'zod';
import { EncodedVaultSwapData } from './encodeVaultSwapData.js';
import { NetworkInfo } from './networkInfo.js';
import { getAccountCreationDepositChannelSchema } from './openAccountCreationDepositChannel.js';
import { DepositChannelInfo, getOpenSwapDepositChannelSchema } from './openSwapDepositChannel.js';
import {
  getParameterEncodingRequestSchema,
  getVaultSwapParameterEncodingRequestSchema,
} from '../broker.js';
import { hexString } from '../parsers.js';

export type ApiRoute = {
  method: 'GET' | 'POST';
  path: `/api/${string}`;
  body?: z.ZodType;
  responses: Record<number, z.ZodType>;
};

export const createApiContract = (network: ChainflipNetwork) =>
  ({
    networkInfo: {
      method: 'GET',
      path: '/api/networkInfo',
      responses: {
        200: NetworkInfo,
      },
    },
    encodeCfParameters: {
      method: 'POST',
      path: '/api/encodeCfParameters',
      body: getParameterEncodingRequestSchema(network),
      responses: {
        200: hexString,
      },
    },
    encodeVaultSwapData: {
      method: 'POST',
      path: '/api/encodeVaultSwapData',
      body: getVaultSwapParameterEncodingRequestSchema(network),
      responses: {
        200: EncodedVaultSwapData,
      },
    },
    openSwapDepositChannel: {
      method: 'POST',
      path: '/api/openSwapDepositChannel',
      body: getOpenSwapDepositChannelSchema(network),
      responses: {
        201: DepositChannelInfo,
      },
    },
    openAccountCreationDepositChannel: {
      method: 'POST',
      path: '/api/openAccountCreationDepositChannel',
      body: getAccountCreationDepositChannelSchema(network),
      responses: {
        201: DepositChannelInfo,
      },
    },
  }) as const satisfies Record<string, ApiRoute>;

export type ApiContract = ReturnType<typeof createApiContract>;

type Digit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
type HttpStatusCode = `${1 | 2 | 3 | 4 | 5}${Digit}${Digit}` extends `${infer N extends number}`
  ? N
  : never;

type ResponseStatus<R extends ApiRoute> = keyof R['responses'] & number;

/** the body the client sends, i.e. the input of the request body schema */
export type ApiRequestBody<R extends ApiRoute> = R extends { body: z.ZodType }
  ? z.input<R['body']>
  : never;

/** the body the server handler receives, i.e. the output of the request body schema */
export type ApiParsedBody<R extends ApiRoute> = R extends { body: z.ZodType }
  ? z.output<R['body']>
  : undefined;

/** a response declared in the contract */
export type ApiSuccessResponse<R extends ApiRoute> = {
  [S in ResponseStatus<R>]: { status: S; body: z.output<R['responses'][S]> };
}[ResponseStatus<R>];

/** a response with a status that is not declared in the contract (e.g. validation errors) */
export type ApiUnexpectedResponse<R extends ApiRoute> = {
  status: Exclude<HttpStatusCode, ResponseStatus<R>>;
  body: unknown;
};

export type ApiResponse<R extends ApiRoute> = ApiSuccessResponse<R> | ApiUnexpectedResponse<R>;
