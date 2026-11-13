import type { ChainflipNetwork } from '@chainflip/utils/chainflip';
import express, { type Response } from 'express';
import type { z } from 'zod';
import type { EncodedVaultSwapData } from '@/shared/api/encodeVaultSwapData.js';
import { getAccountCreationDepositChannelSchema } from '@/shared/api/openAccountCreationDepositChannel.js';
import {
  type DepositChannelInfo,
  getOpenSwapDepositChannelSchema,
} from '@/shared/api/openSwapDepositChannel.js';
import {
  getParameterEncodingRequestSchema,
  getVaultSwapParameterEncodingRequestSchema,
} from '@/shared/broker.js';
import { stringifyBigInts } from '@/shared/objects.js';
import { asyncHandler, jsonBodyParser, maintenanceMode } from './middlewares/common.js';
import { encodeCfParameters } from '../handlers/encodeCfParameters.js';
import { encodeVaultSwapData } from '../handlers/encodeVaultSwapData.js';
import networkInfo from '../handlers/networkInfo.js';
import { openAccountCreationDepositChannel } from '../handlers/openAccountCreationDepositChannel.js';
import { openSwapDepositChannel } from '../handlers/openSwapDepositChannel.js';

/**
 * parses the request body with the given schema and responds with the zod issues
 * if it is invalid, otherwise calls the handler with the parsed body
 */
const withBody = <T extends z.ZodType>(
  schema: T,
  handler: (body: z.output<T>, res: Response) => Promise<void>,
) =>
  asyncHandler(async (req, res) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      // same shape as the serialized zod v3 `ZodError` previously returned by ts-rest
      res.status(400).json({ issues: result.error.issues, name: result.error.name });
      return;
    }

    await handler(result.data, res);
  });

export const createApiRouter = (network: ChainflipNetwork) => {
  const router = express.Router();

  router.get(
    '/networkInfo',
    maintenanceMode,
    jsonBodyParser(),
    asyncHandler(async (_req, res) => {
      res.status(200).json(await networkInfo());
    }),
  );

  router.post(
    '/encodeCfParameters',
    maintenanceMode,
    jsonBodyParser(),
    withBody(getParameterEncodingRequestSchema(network), async (body, res) => {
      res.status(200).json(await encodeCfParameters(body));
    }),
  );

  router.post(
    '/encodeVaultSwapData',
    maintenanceMode,
    jsonBodyParser(),
    withBody(getVaultSwapParameterEncodingRequestSchema(network), async (body, res) => {
      const data = stringifyBigInts(await encodeVaultSwapData(body));
      res.status(200).json(data satisfies z.input<typeof EncodedVaultSwapData>);
    }),
  );

  router.post(
    '/openSwapDepositChannel',
    maintenanceMode,
    jsonBodyParser(),
    withBody(getOpenSwapDepositChannelSchema(network), async (body, res) => {
      const data = stringifyBigInts(await openSwapDepositChannel(body));
      res.status(201).json(data satisfies z.input<typeof DepositChannelInfo>);
    }),
  );

  router.post(
    '/openAccountCreationDepositChannel',
    maintenanceMode,
    jsonBodyParser(),
    withBody(getAccountCreationDepositChannelSchema(network), async (body, res) => {
      res.status(201).json(await openAccountCreationDepositChannel(body));
    }),
  );

  return router;
};
