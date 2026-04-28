/* eslint-disable no-console */
import { internalAssetToRpcAsset } from '@chainflip/utils/chainflip';
import * as crypto from 'crypto';
import { promisify } from 'util';
import { io } from 'socket.io-client';
import prisma from '../src/client.js';

const generateKeyPairAsync = promisify(crypto.generateKeyPair);

type Mode = 'respond' | 'timeout' | 'invalid' | 'wrong-id';

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .map((arg) => arg.replace(/^--/, '').split('='))
    .map(([k, v]) => [k, v ?? 'true']),
) as { mode?: Mode; url?: string; name?: string };

const mode: Mode = args.mode ?? 'respond';
const url = args.url ?? 'http://localhost:8080';
const name = args.name ?? 'mock-mm';

const QUOTED_ASSETS = Object.values(internalAssetToRpcAsset);

async function upsertMarketMaker(): Promise<crypto.KeyObject> {
  const { publicKey, privateKey } = await generateKeyPairAsync('ed25519');
  const publicKeyPem = publicKey.export({ format: 'pem', type: 'spki' }).toString();

  await prisma.marketMaker.upsert({
    where: { name },
    create: { name, publicKey: publicKeyPem, beta: false },
    update: { publicKey: publicKeyPem, beta: false },
  });

  console.log(`[mock-mm] upserted MarketMaker "${name}"`);
  return privateKey;
}

function buildLimitOrderReply(requestId: string, legCount: 1 | 2) {
  const leg = [[0, '1000000000000000000'] as [number, string]];
  return {
    request_id: requestId,
    legs: legCount === 2 ? [leg, leg] : [leg],
  };
}

async function main() {
  const privateKey = await upsertMarketMaker();
  const timestamp = Date.now();
  const signature = crypto
    .sign(null, Buffer.from(`${name}${timestamp}`, 'utf8'), privateKey)
    .toString('base64');

  const socket = io(url, {
    auth: {
      client_version: '2',
      account_id: name,
      timestamp,
      signature,
      quoted_assets: QUOTED_ASSETS,
    },
  });

  socket.on('connect', () => {
    console.log(`[mock-mm] connected as "${name}" (mode=${mode})`);
  });

  socket.on('connect_error', (err) => {
    console.error('[mock-mm] connect error:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log(`[mock-mm] disconnected: ${reason}`);
  });

  socket.on('quote_error', (msg) => {
    console.log('[mock-mm] received quote_error:', msg);
  });

  socket.on('quote_request', (request: { request_id: string; legs: unknown[] }) => {
    const legCount = (request.legs.length === 2 ? 2 : 1) as 1 | 2;
    console.log(
      `[mock-mm] quote_request id=${request.request_id} legs=${legCount} → mode=${mode}`,
    );

    if (mode === 'timeout') return;

    if (mode === 'invalid') {
      socket.emit('quote_response', { request_id: request.request_id, legs: 'not-an-array' });
      return;
    }

    if (mode === 'wrong-id') {
      socket.emit('quote_response', buildLimitOrderReply(crypto.randomUUID(), legCount));
      return;
    }

    socket.emit('quote_response', buildLimitOrderReply(request.request_id, legCount));
  });

  const shutdown = async () => {
    console.log('[mock-mm] shutting down');
    socket.disconnect();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(async (err) => {
  console.error('[mock-mm] fatal:', err);
  await prisma.$disconnect();
  process.exit(1);
});
