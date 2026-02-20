import {
  chainflipAssets,
  InternalAssetMap,
  internalAssetToRpcAsset,
} from '@chainflip/utils/chainflip';
import * as crypto from 'crypto';
import { promisify } from 'util';
import { vi, describe, it, beforeEach, expect, Mock } from 'vitest';
import prisma, { Prisma } from '../../client.js';
import env from '../../config/env.js';
import authenticate from '../authenticate.js';

const generateKeyPairAsync = promisify(crypto.generateKeyPair);
const allAssets = Object.values(internalAssetToRpcAsset);

const oldEnv = structuredClone(env);

describe(authenticate, () => {
  let next: Mock;
  let privateKey: crypto.KeyObject;

  beforeEach(async () => {
    Object.assign(env, oldEnv);
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
    { client_version: '2' },
    { account_id: 'web_team_whales' },
    { timestamp: Date.now() },
    { signature: 'deadbeef' },
    { client_version: '2', account_id: 'web_team_whales' },
    { client_version: '2', timestamp: Date.now() },
    { client_version: '2', signature: 'deadbeef' },
    { account_id: 'web_team_whales', timestamp: Date.now() },
    { account_id: 'web_team_whales', signature: 'deadbeef' },
    { timestamp: Date.now(), signature: 'deadbeef' },
    {
      client_version: '2',
      account_id: 'web_team_whales',
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
            client_version: '2',
            account_id: 'web_team_whales',
            timestamp: Date.now() + diff,
            signature: 'deadbeef',
            quoted_assets: allAssets,
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
            client_version: '2',
            account_id: 'unknown',
            timestamp: Date.now(),
            signature: 'deadbeef',
            quoted_assets: allAssets,
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
            client_version: '2',
            account_id: 'web_team_whales',
            timestamp: Date.now(),
            // test different lengths
            signature: 'deadbeef',
            quoted_assets: allAssets,
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
      client_version: '2',
      account_id: 'web_team_whales',
      timestamp: Date.now(),
      // test different lengths
      signature: 'deadbeef',
      quoted_assets: allAssets,
    },
    {
      client_version: '2',
      account_id: 'web_team_whales',
      timestamp: Date.now(),
      // test same lengths
      signature: 'deadbeefdeadbeefdeadbeefdeadbeef',
      quoted_assets: allAssets,
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

  const marketMakerDataOptions = [
    { beta: true, useMevFactor: false },
    { beta: false, useMevFactor: true },
  ] as const;

  const mevFactorOptions: Prisma.FactorCreateManyMarketMakerInput[] = [
    { asset: 'Flip', factor: 1, side: 'SELL', type: 'MEV' },
    { asset: 'Flip', factor: -1, side: 'BUY', type: 'MEV' },
  ];

  it.each(marketMakerDataOptions.map((opts) => ({ ...opts, mevFactors: mevFactorOptions })))(
    'accepts valid v2 authentication (%o)',
    async ({ useMevFactor, mevFactors, ...data }) => {
      env.QUOTER_USE_MEV_FACTOR = useMevFactor;
      const timestamp = Date.now();
      const name = 'web_team_whales';

      await prisma.marketMaker.update({
        where: { name },
        data: { ...data, factors: { createMany: { data: mevFactors } } },
      });

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
        chainflipAssets.map((asset) => [asset, false]),
      ) as InternalAssetMap<boolean>;
      quotedAssets.Flip = true;

      await authenticate(socket as any, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
      expect((socket as any).data).toMatchSnapshot();
    },
  );
});
