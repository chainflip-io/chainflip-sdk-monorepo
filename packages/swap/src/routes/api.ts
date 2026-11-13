import type { Express } from 'express';
import type { z } from 'zod';
import type { ApiContract, ApiParsedBody, ApiRoute } from '@/shared/api/contract.js';
import { stringifyBigInts } from '@/shared/objects.js';
import { asyncHandler, jsonBodyParser, maintenanceMode } from './middlewares/common.js';
import { encodeCfParameters } from '../handlers/encodeCfParameters.js';
import { encodeVaultSwapData } from '../handlers/encodeVaultSwapData.js';
import networkInfo from '../handlers/networkInfo.js';
import { openAccountCreationDepositChannel } from '../handlers/openAccountCreationDepositChannel.js';
import { openSwapDepositChannel } from '../handlers/openSwapDepositChannel.js';

type HandlerResponse<R extends ApiRoute> = {
  [S in keyof R['responses'] & number]: { status: S; body: z.input<R['responses'][S]> };
}[keyof R['responses'] & number];

type ApiHandlers = {
  [K in keyof ApiContract]: (
    body: ApiParsedBody<ApiContract[K]>,
  ) => Promise<HandlerResponse<ApiContract[K]>>;
};

const handlers: ApiHandlers = {
  networkInfo: async () => ({
    status: 200,
    body: await networkInfo(),
  }),
  encodeCfParameters: async (body) => ({
    status: 200,
    body: await encodeCfParameters(body),
  }),
  encodeVaultSwapData: async (body) => ({
    status: 200,
    body: stringifyBigInts(await encodeVaultSwapData(body)),
  }),
  openSwapDepositChannel: async (body) => ({
    status: 201,
    body: stringifyBigInts(await openSwapDepositChannel(body)),
  }),
  openAccountCreationDepositChannel: async (body) => ({
    status: 201,
    body: await openAccountCreationDepositChannel(body),
  }),
};

export const registerApiRoutes = (app: Express, contract: ApiContract) => {
  (Object.entries(contract) as [keyof ApiContract, ApiRoute][]).forEach(([name, route]) => {
    const handler = handlers[name] as (body: unknown) => Promise<{ status: number; body: unknown }>;

    app[route.method === 'GET' ? 'get' : 'post'](
      route.path,
      maintenanceMode,
      jsonBodyParser(),
      asyncHandler(async (req, res) => {
        let body: unknown;

        if (route.body) {
          const result = route.body.safeParse(req.body);

          if (!result.success) {
            // same shape as the serialized `ZodError` previously returned by ts-rest
            res.status(400).json({ issues: result.error.issues, name: result.error.name });
            return;
          }

          body = result.data;
        }

        const response = await handler(body);

        res.status(response.status).json(response.body);
      }),
    );
  });
};
