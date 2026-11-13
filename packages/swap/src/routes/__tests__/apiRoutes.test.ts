import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import env from '../../config/env.js';
import { encodeCfParameters } from '../../handlers/encodeCfParameters.js';
import { encodeVaultSwapData } from '../../handlers/encodeVaultSwapData.js';
import networkInfo from '../../handlers/networkInfo.js';
import { openAccountCreationDepositChannel } from '../../handlers/openAccountCreationDepositChannel.js';
import { openSwapDepositChannel } from '../../handlers/openSwapDepositChannel.js';
import ServiceError from '../../utils/ServiceError.js';
import { createApiRouter } from '../api.js';
import { handleError } from '../middlewares/common.js';

vi.mock('../../handlers/encodeCfParameters.js', () => ({ encodeCfParameters: vi.fn() }));
vi.mock('../../handlers/encodeVaultSwapData.js', () => ({ encodeVaultSwapData: vi.fn() }));
vi.mock('../../handlers/networkInfo.js', () => ({ default: vi.fn() }));
vi.mock('../../handlers/openAccountCreationDepositChannel.js', () => ({
  openAccountCreationDepositChannel: vi.fn(),
}));
vi.mock('../../handlers/openSwapDepositChannel.js', () => ({ openSwapDepositChannel: vi.fn() }));

const app = express();
app.use('/api', createApiRouter(env.CHAINFLIP_NETWORK));
app.use(handleError);

const openSwapDepositChannelBody = {
  srcAsset: { asset: 'FLIP', chain: 'Ethereum' },
  destAsset: { asset: 'BTC', chain: 'Bitcoin' },
  destAddress: 'tb1pdz3akc5wa2gr69v3x87tfg0ka597dxqvfl6zhqx4y202y63cgw0q3rgpm6',
  amount: '777',
  fillOrKillParams: {
    refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
    refundCcmMetadata: null,
    retryDurationBlocks: 2,
    minPriceX128: '1',
    maxOraclePriceSlippage: 50,
  },
};

describe(createApiRouter, () => {
  let oldEnv: typeof env;

  beforeEach(() => {
    vi.resetAllMocks();
    oldEnv = structuredClone(env);
  });

  afterEach(() => {
    Object.assign(env, oldEnv);
  });

  it('passes the parsed body to the handler and stringifies bigints in the response', async () => {
    vi.mocked(openSwapDepositChannel).mockResolvedValueOnce({
      id: '1-Ethereum-2',
      channelOpeningFee: 5n,
    } as never);

    const res = await request(app)
      .post('/api/openSwapDepositChannel')
      .send({ ...openSwapDepositChannelBody, unknownField: 'stripped' });

    expect(res.status).toBe(201);
    expect(res.headers['content-type']).toBe('application/json; charset=utf-8');
    expect(res.body).toEqual({ id: '1-Ethereum-2', channelOpeningFee: '5' });

    const [input] = vi.mocked(openSwapDepositChannel).mock.calls[0];
    expect(input).not.toHaveProperty('unknownField');
    // schema transforms are applied before the handler is called
    expect(input).toHaveProperty('expectedDepositAmount', '777');
    expect(input).not.toHaveProperty('amount');
  });

  it('responds to GET routes', async () => {
    vi.mocked(networkInfo).mockResolvedValueOnce({ assets: [] } as never);

    const res = await request(app).get('/api/networkInfo');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ assets: [] });
  });

  it('sends JSON string responses', async () => {
    vi.mocked(encodeCfParameters).mockResolvedValueOnce('0xdeadbeef');

    const res = await request(app)
      .post('/api/encodeCfParameters')
      .send({
        ...openSwapDepositChannelBody,
        srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
        destAsset: { asset: 'ETH', chain: 'Ethereum' },
        destAddress: '0xe983fD1798689eee00c0Fb77e79B8f372DF41060',
        fillOrKillParams: {
          ...openSwapDepositChannelBody.fillOrKillParams,
          refundAddress: 'tb1pdz3akc5wa2gr69v3x87tfg0ka597dxqvfl6zhqx4y202y63cgw0q3rgpm6',
        },
      });

    expect(res.status).toBe(200);
    expect(res.text).toBe('"0xdeadbeef"');
  });

  it('rejects invalid bodies with the zod issues', async () => {
    const res = await request(app)
      .post('/api/openSwapDepositChannel')
      .send({ ...openSwapDepositChannelBody, srcAsset: { asset: 'NOPE', chain: 'Ethereum' } });

    expect(res.status).toBe(400);
    expect(res.body).toMatchInlineSnapshot(`
      {
        "issues": [
          {
            "code": "custom",
            "message": "Invalid input",
            "path": [
              "srcAsset",
            ],
          },
        ],
        "name": "ZodError",
      }
    `);
    expect(openSwapDepositChannel).not.toHaveBeenCalled();
  });

  it('rejects requests without a body', async () => {
    const res = await request(app).post('/api/encodeVaultSwapData');

    expect(res.status).toBe(400);
    expect(res.body.name).toBe('ZodError');
    expect(res.body.issues.length).toBeGreaterThan(0);
    expect(encodeVaultSwapData).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON', async () => {
    const res = await request(app)
      .post('/api/openAccountCreationDepositChannel')
      .set('content-type', 'application/json')
      .send('{"asset":');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message');
    expect(openAccountCreationDepositChannel).not.toHaveBeenCalled();
  });

  it.each([
    ['get', '/api/networkInfo'],
    ['post', '/api/openSwapDepositChannel'],
  ] as const)('responds with 503 in maintenance mode (%s %s)', async (method, path) => {
    env.MAINTENANCE_MODE = true;

    const res = await request(app)[method](path).send(openSwapDepositChannelBody);

    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      message: 'The swap service is currently unavailable due to maintenance',
    });
  });

  it('forwards service errors to the error handler', async () => {
    vi.mocked(openSwapDepositChannel).mockRejectedValueOnce(
      ServiceError.badRequest('too many channels'),
    );

    const res = await request(app)
      .post('/api/openSwapDepositChannel')
      .send(openSwapDepositChannelBody);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'too many channels' });
  });

  it('responds with 500 for unknown errors', async () => {
    vi.mocked(openSwapDepositChannel).mockRejectedValueOnce(new Error('boom'));

    const res = await request(app)
      .post('/api/openSwapDepositChannel')
      .send(openSwapDepositChannelBody);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ message: 'unknown error' });
  });

  it.each([
    ['get', '/api/openSwapDepositChannel'],
    ['post', '/api/networkInfo'],
    ['get', '/api/unknown'],
  ] as const)('does not handle %s %s', async (method, path) => {
    const res = await request(app)[method](path);

    expect(res.status).toBe(404);
  });
});
