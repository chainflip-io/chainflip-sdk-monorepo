import { initServer } from '@ts-rest/express';
import { apiContract } from '@/shared/api/contract.js';
import { stringifyBigInts } from '@/shared/objects.js';
import { encodeCfParameters } from '../handlers/encodeCfParameters.js';
import { encodeVaultSwapData } from '../handlers/encodeVaultSwapData.js';
import networkInfo from '../handlers/networkInfo.js';
import { openSwapDepositChannel } from '../handlers/openSwapDepositChannel.js';

const s = initServer();

export const apiRouter = s.router(apiContract, {
  encodeVaultSwapData: async ({ body }) => ({
    status: 200,
    body: stringifyBigInts(await encodeVaultSwapData(body)),
  }),
  networkInfo: async () => ({
    status: 200,
    body: await networkInfo(),
  }),
  openSwapDepositChannel: async ({ body }) => ({
    status: 201,
    body: stringifyBigInts(
      await openSwapDepositChannel({
        ...body,
        srcAsset: body.srcAsset.asset,
        srcChain: body.srcAsset.chain,
        destAsset: body.destAsset.asset,
        destChain: body.destAsset.chain,
      }),
    ),
  }),
  encodeCfParameters: async ({ body }) => ({
    status: 200,
    body: await encodeCfParameters(body),
  }),
});
