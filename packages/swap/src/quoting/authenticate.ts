import * as crypto from 'crypto';
import type { Server } from 'socket.io';
import { promisify } from 'util';
import { z } from 'zod';
import { InternalAssetMap, getInternalAsset, InternalAsset, InternalAssets } from '@/shared/enums';
import { isNotNullish } from '@/shared/guards';
import { assetAndChain } from '@/shared/parsers';
import prisma from '../client';
import { type QuotingSocket } from './Quoter';
import logger from '../utils/logger';

const verifyAsync = promisify(crypto.verify);

type Middleware = Parameters<Server['use']>[0];
type Next = Parameters<Middleware>[1];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const mapAssets = (quotedAssets: InternalAsset[] | null): InternalAssetMap<boolean> => {
  assert(quotedAssets === null || quotedAssets.length !== 0, 'no assets quoted');

  return Object.fromEntries(
    Object.values(InternalAssets).map(
      (asset) => [asset, quotedAssets === null || quotedAssets.includes(asset)] as const,
    ),
  ) as InternalAssetMap<boolean>;
};

const authSchema = z.union([
  z
    .object({
      client_version: z.literal('1'),
      market_maker_id: z.string(),
      timestamp: z.number(),
      signature: z.string(),
    })
    .transform((data) => ({ ...data, quoted_assets: mapAssets(null) })),
  z.object({
    client_version: z.literal('2'),
    market_maker_id: z.string(),
    timestamp: z.number(),
    signature: z.string(),
    quoted_assets: z
      .array(assetAndChain.transform(getInternalAsset))
      .transform((assets) => mapAssets(assets.filter(isNotNullish))),
  }),
]);

const parseKey = (key: string) => {
  try {
    return crypto.createPublicKey({ key: Buffer.from(key), format: 'pem', type: 'spki' });
  } catch {
    throw new Error('invalid public key');
  }
};

const authenticate = async (socket: QuotingSocket, next: Next) => {
  try {
    const result = authSchema.safeParse(socket.handshake.auth);

    logger.info('received auth', { auth: result.data, error: result.error?.message });

    assert(result.success, 'invalid auth');

    const auth = result.data;
    const timeElapsed = Date.now() - auth.timestamp;
    assert(timeElapsed < 30_000 && timeElapsed >= -30_000, 'invalid timestamp');

    logger.info('time elapsed from handshake timestamp', { timeElapsed });

    const marketMaker = await prisma.marketMaker.findUnique({
      where: { name: auth.market_maker_id },
    });

    assert(marketMaker, 'market maker not found');

    const key = parseKey(marketMaker.publicKey);

    const signaturesMatch = await verifyAsync(
      null,
      Buffer.from(`${auth.market_maker_id}${auth.timestamp}`, 'utf8'),
      key,
      Buffer.from(auth.signature, 'base64'),
    );

    assert(signaturesMatch, 'invalid signature');

    // https://socket.io/docs/v4/server-socket-instance/#socketdata
    // eslint-disable-next-line no-param-reassign
    socket.data = { marketMaker: marketMaker.name, quotedAssets: auth.quoted_assets };

    next();
  } catch (error) {
    next(error as Error);
  }
};

export default authenticate;
