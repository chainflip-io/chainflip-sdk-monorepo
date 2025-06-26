import { initServer } from '@ts-rest/express';
import { apiContract } from '@/shared/api/contract.js';
import { encodeVaultSwapData } from '../handlers/encodeVaultSwapData.js';
import networkStatus from '../handlers/networkStatus.js';
import { openSwapDepositChannel } from '../handlers/openSwapDepositChannel.js';

const s = initServer();

export const apiRouter = s.router(apiContract, {
  encodeVaultSwapData: async ({ body }) => ({
    status: 200,
    body: await encodeVaultSwapData(body),
  }),
  networkStatus: async () => ({
    status: 200,
    body: await networkStatus(),
  }),
  openSwapDepositChannel: async ({ body }) => ({
    status: 200,
    body: await openSwapDepositChannel(body),
  }),
});
