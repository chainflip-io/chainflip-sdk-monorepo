import * as crypto from 'crypto';
import type { Server, Socket } from 'socket.io';
import { promisify } from 'util';
import { z } from 'zod';
import prisma from '../client';

const verifyAsync = promisify(crypto.verify);

type Middleware = Parameters<Server['use']>[0];
type Next = Parameters<Middleware>[1];

export type QuotingSocket = Omit<Socket, 'data'> & { data: { marketMaker: string } };

const authSchema = z.object({
  client_version: z.literal('1'),
  market_maker_id: z.string(),
  timestamp: z.number(),
  signature: z.string(),
});

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

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

    assert(result.success, 'invalid auth');

    const auth = result.data;
    const timeElapsed = Date.now() - auth.timestamp;
    assert(timeElapsed < 30_000 && timeElapsed >= -30_000, 'invalid timestamp');

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
    socket.data = { marketMaker: marketMaker.name };

    next();
  } catch (error) {
    next(error as Error);
  }
};

export default authenticate;
