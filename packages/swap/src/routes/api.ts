import { initServer } from '@ts-rest/express';
import { apiContract } from '@/shared/api/contract.js';
import { stringifyBigInts } from '@/shared/objects.js';
import { encodeCfParameters } from '../handlers/encodeCfParameters.js';
import { encodeVaultSwapData } from '../handlers/encodeVaultSwapData.js';
import networkStatus from '../handlers/networkStatus.js';
import { openSwapDepositChannel } from '../handlers/openSwapDepositChannel.js';

const s = initServer();

export const apiRouter = s.router(apiContract, {
  encodeVaultSwapData: async ({ body }) => ({
    status: 200,
    body: stringifyBigInts(await encodeVaultSwapData(body)),
  }),
  networkStatus: async () => ({
    status: 200,
    body: stringifyBigInts(await networkStatus()),
  }),
  openSwapDepositChannel: async ({ body }) => ({
    status: 201,
    body: stringifyBigInts(await openSwapDepositChannel(body)),
  }),
  encodeCfParameters: async ({ body }) => ({
    status: 200,
    body: await encodeCfParameters(body),
  }),
});
