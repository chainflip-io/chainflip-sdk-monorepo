import * as crypto from 'crypto';
import { promisify } from 'util';
import { vi, describe, it, beforeEach, expect, Mock } from 'vitest';
import { InternalAssetMap, InternalAssets } from '@/shared/enums';
import prisma from '../../client';
import authenticate from '../authenticate';

const generateKeyPairAsync = promisify(crypto.generateKeyPair);

describe(authenticate, () => {
  let next: Mock;
  let privateKey: crypto.KeyObject;

  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE private."MarketMaker" CASCADE`;
    next = vi.fn();
    const pair = await generateKeyPairAsync('ed25519');
    await prisma.marketMaker.create({
      data: {
        name: 'web_team_whales',
        publicKey: pair.publicKey.export({ format: 'pem', type: 'spki' }).toString('base64'),
      },
    });
    privateKey = pair.privateKey;
  });

  it.each([
    {},
    { client_version: '1' },
    { market_maker_id: 'web_team_whales' },
    { timestamp: Date.now() },
    { signature: 'deadbeef' },
    { client_version: '1', market_maker_id: 'web_team_whales' },
    { client_version: '1', timestamp: Date.now() },
    { client_version: '1', signature: 'deadbeef' },
    { market_maker_id: 'web_team_whales', timestamp: Date.now() },
    { market_maker_id: 'web_team_whales', signature: 'deadbeef' },
    { timestamp: Date.now(), signature: 'deadbeef' },
    {
      client_version: '1',
      market_maker_id: 'web_team_whales',
      timestamp: Date.now(),
    },
  ])('rejects invalid auth shape', async (auth) => {
    await authenticate({ handshake: { auth } } as any, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(new Error('invalid auth'));
  });

  it.each([[-30001, 30000]])('rejects invalid timestamps', async (diff) => {
    await authenticate(
      {
        handshake: {
          auth: {
            client_version: '1',
            market_maker_id: 'web_team_whales',
            timestamp: Date.now() + diff,
            signature: 'deadbeef',
          },
        },
      } as any,
      next,
    );
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(new Error('invalid timestamp'));
  });

  it('rejects unknown market maker', async () => {
    await authenticate(
      {
        handshake: {
          auth: {
            client_version: '1',
            market_maker_id: 'unknown',
            timestamp: Date.now(),
            signature: 'deadbeef',
          },
        },
      } as any,
      next,
    );
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(new Error('market maker not found'));
  });

  it('rejects invalid public key', async () => {
    await prisma.marketMaker.update({
      where: { name: 'web_team_whales' },
      data: { publicKey: 'invalid' },
    });

    await authenticate(
      {
        handshake: {
          auth: {
            client_version: '1',
            market_maker_id: 'web_team_whales',
            timestamp: Date.now(),
            // test different lengths
            signature: 'deadbeef',
          },
        },
      } as any,
      next,
    );

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(new Error('invalid public key'));
  });

  it.each([
    {
      client_version: '1',
      market_maker_id: 'web_team_whales',
      timestamp: Date.now(),
      // test different lengths
      signature: 'deadbeef',
    },
    {
      client_version: '1',
      market_maker_id: 'web_team_whales',
      timestamp: Date.now(),
      // test same lengths
      signature: 'deadbeefdeadbeefdeadbeefdeadbeef',
    },
  ])('rejects invalid signature', async (auth) => {
    await authenticate(
      {
        handshake: {
          auth,
        },
      } as any,
      next,
    );
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(new Error('invalid signature'));
  });

  it('accepts valid v1 authentication', async () => {
    const timestamp = Date.now();
    const name = 'web_team_whales';

    const signature = crypto
      .sign(null, Buffer.from(`${name}${timestamp}`, 'utf8'), privateKey)
      .toString('base64');

    const socket = {
      handshake: {
        auth: {
          client_version: '1',
          market_maker_id: name,
          timestamp,
          signature,
        },
      },
    };

    await authenticate(socket as any, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
    expect((socket as any).data).toStrictEqual({
      marketMaker: name,
      quotedAssets: Object.fromEntries(Object.values(InternalAssets).map((asset) => [asset, true])),
      clientVersion: '1',
    });
  });

  it('accepts valid v2 authentication', async () => {
    const timestamp = Date.now();
    const name = 'web_team_whales';

    const signature = crypto
      .sign(null, Buffer.from(`${name}${timestamp}`, 'utf8'), privateKey)
      .toString('base64');

    const socket = {
      handshake: {
        auth: {
          client_version: '2',
          account_id: name,
          timestamp,
          signature,
          quoted_assets: [{ chain: 'Ethereum', asset: 'FLIP' }],
        },
      },
    };

    const quotedAssets = Object.fromEntries(
      Object.values(InternalAssets).map((asset) => [asset, false]),
    ) as InternalAssetMap<boolean>;
    quotedAssets.Flip = true;

    await authenticate(socket as any, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
    expect((socket as any).data).toStrictEqual({
      marketMaker: name,
      quotedAssets,
      clientVersion: '2',
    });
  });
});
