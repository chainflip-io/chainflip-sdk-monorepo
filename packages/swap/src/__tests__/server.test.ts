import * as crypto from 'crypto';
import EventEmitter, { once } from 'events';
import { Server } from 'http';
import { AddressInfo } from 'net';
import { Socket, io } from 'socket.io-client';
import request from 'supertest';
import { setTimeout as sleep } from 'timers/promises';
import { promisify } from 'util';
import { describe, it, beforeEach, afterEach, expect, beforeAll } from 'vitest';
import prisma from '../client.js';
import app from '../server.js';

const generateKeyPairAsync = promisify(crypto.generateKeyPair);

describe('server', () => {
  let server: Server;

  beforeAll(() => {
    server = app.listen(0);
    return () => {
      server.close();
    };
  });

  describe('GET /healthcheck', () => {
    it('gets the fees', async () => {
      expect((await request(app).get('/healthcheck')).text).toBe('OK');
    });
  });

  describe('socket.io', () => {
    let socket: Socket;
    const name = 'web_team_whales';
    let privateKey: crypto.KeyObject;

    beforeEach(async () => {
      await prisma.$queryRaw`TRUNCATE TABLE private."MarketMaker" CASCADE`;

      const result = await generateKeyPairAsync('ed25519');
      await prisma.marketMaker.create({
        data: {
          name,
          publicKey: result.publicKey.export({ format: 'pem', type: 'spki' }).toString(),
        },
      });
      privateKey = result.privateKey;
    });

    afterEach(() => {
      socket.disconnect();
    });

    it('can connect to the server', async () => {
      const { port } = server.address() as AddressInfo;
      const timestamp = Date.now();

      socket = io(`http://localhost:${port}`, {
        auth: {
          client_version: '2',
          account_id: name,
          timestamp,
          signature: crypto
            .sign(null, Buffer.from(`${name}${timestamp}`, 'utf8'), privateKey)
            .toString('base64'),
          quoted_assets: [{ chain: 'Ethereum', asset: 'FLIP' }],
        },
      });

      const connected = await Promise.race([
        sleep(500).then(() => false),
        once(socket as unknown as EventEmitter, 'connect').then(() => true),
      ]);

      expect(connected).toBe(true);
    });
  });
});
