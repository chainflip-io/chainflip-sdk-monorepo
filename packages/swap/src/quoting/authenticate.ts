import { ChainflipAsset, getInternalAsset, InternalAssetMap } from '@chainflip/utils/chainflip';
import { toLowerCase } from '@chainflip/utils/string';
import * as crypto from 'crypto';
import type { Server } from 'socket.io';
import { promisify } from 'util';
import { z } from 'zod';
import { createInternalAssetMap } from '@/shared/dataStructures.js';
import { isNotNullish } from '@/shared/guards.js';
import { assetAndChain } from '@/shared/parsers.js';
import prisma from '../client.js';
import { AccountId, type QuotingSocket } from './Quoter.js';
import env from '../config/env.js';
import baseLogger from '../utils/logger.js';

const logger = baseLogger.child({ module: 'quoter' });

const verifyAsync = promisify(crypto.verify);

type Middleware = Parameters<Server['use']>[0];
type Next = Parameters<Middleware>[1];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const mapAssets = (quotedAssets: ChainflipAsset[] | null): InternalAssetMap<boolean> => {
  assert(quotedAssets === null || quotedAssets.length !== 0, 'no assets quoted');

  const map = createInternalAssetMap(false);

  quotedAssets?.forEach((asset) => {
    map[asset] = true;
  });

  return map;
};

const authSchema = z.object({
  client_version: z.literal('2'),
  account_id: z.string(),
  timestamp: z.number(),
  signature: z.string(),
  quoted_assets: z
    .array(assetAndChain.transform(getInternalAsset))
    .transform((assets) => mapAssets(assets.filter(isNotNullish))),
});

const parseKey = (key: string) => {
  try {
    return crypto.createPublicKey({ key: Buffer.from(key), format: 'pem', type: 'spki' });
  } catch {
    throw new Error('invalid public key');
  }
};

const authenticate = async (socket: QuotingSocket, next: Next) => {
  let accountId: string | undefined;

  try {
    const result = authSchema.safeParse(socket.handshake.auth);

    logger.info('received auth', { auth: result.data, error: result.error?.message });

    assert(result.success, 'invalid auth');

    accountId = result.data.account_id;

    const auth = result.data;
    const timeElapsed = Date.now() - auth.timestamp;

    logger.info('time elapsed from handshake timestamp', { timeElapsed });

    assert(timeElapsed < 30_000 && timeElapsed >= -30_000, 'invalid timestamp');

    const marketMaker = await prisma.marketMaker.findUnique({
      where: { name: auth.account_id },
      include: { factors: true },
    });

    assert(marketMaker, 'market maker not found');

    const key = parseKey(marketMaker.publicKey);

    const signaturesMatch = await verifyAsync(
      null,
      Buffer.from(`${auth.account_id}${auth.timestamp}`, 'utf8'),
      key,
      Buffer.from(auth.signature, 'base64'),
    );

    assert(signaturesMatch, 'invalid signature');

    // https://socket.io/docs/v4/server-socket-instance/#socketdata
    // eslint-disable-next-line no-param-reassign
    socket.data = {
      marketMaker: marketMaker.name as AccountId,
      quotedAssets: auth.quoted_assets,
      clientVersion: auth.client_version,
      beta: marketMaker.beta,
      mevFactors: marketMaker.factors.reduce(
        (acc, factor) => {
          if (factor.asset === 'Dot') return acc;

          if (factor.type === 'MEV' && env.QUOTER_USE_MEV_FACTOR) {
            if (factor.side === null) {
              logger.error('factor side is null', { factor });
              return acc;
            }
            acc[toLowerCase(factor.side)][factor.asset] =
              factor.factor * (factor.side === 'BUY' ? 1 : -1);
          }
          return acc;
        },
        { buy: createInternalAssetMap(0), sell: createInternalAssetMap(0) },
      ),
      replenishmentFactors: marketMaker.factors.reduce(
        (acc, factor) => {
          if (factor.asset === 'Dot') return acc;

          if (factor.type === 'REPLENISHMENT') {
            if (factor.factor < 0) {
              logger.error('replenishment factor is invalid', { factor });
              return acc;
            }
            if (auth.quoted_assets[factor.asset]) {
              acc[factor.asset] = factor.factor;
            } else {
              logger.warn('attempted to set replenishment factor for unquoted asset', {
                asset: factor.asset,
                marketMaker: marketMaker.name,
              });
            }
          }
          return acc;
        },
        {} as Partial<InternalAssetMap<number>>,
      ),
    };

    next();
  } catch (error) {
    logger.warn('authentication error', { error: (error as Error).message, accountId });
    next(error as Error);
  }
};

export default authenticate;
