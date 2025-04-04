import {
  ChainflipAsset,
  chainflipAssets,
  getInternalAsset,
  InternalAssetMap,
} from '@chainflip/utils/chainflip';
import * as crypto from 'crypto';
import type { Server } from 'socket.io';
import { promisify } from 'util';
import { z } from 'zod';
import { isNotNullish } from '@/shared/guards';
import { assetAndChain } from '@/shared/parsers';
import prisma from '../client';
import { AccountId, type QuotingSocket } from './Quoter';
import baseLogger from '../utils/logger';

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

  return Object.fromEntries(
    chainflipAssets.map(
      (asset) => [asset, quotedAssets === null || quotedAssets.includes(asset)] as const,
    ),
  ) as InternalAssetMap<boolean>;
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
    };

    next();
  } catch (error) {
    logger.warn('authentication error', { error: (error as Error).message, accountId });
    next(error as Error);
  }
};

export default authenticate;
