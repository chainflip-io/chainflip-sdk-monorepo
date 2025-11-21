import { HttpClient } from '@chainflip/rpc';
import { ApiFetcherArgs, initClient } from '@ts-rest/core';
import request from 'supertest';
import { vi, describe, it, beforeAll, beforeEach, afterEach, expect } from 'vitest';
import { createApiContract } from '@/shared/api/contract.js';
import * as broker from '@/shared/broker.js';
import { environment, mockRpcResponse } from '@/shared/tests/fixtures.js';
import prisma from '../../client.js';
import env from '../../config/env.js';
import server from '../../server.js';

vi.mock('@/shared/broker.js', async (importOriginal) => ({
  ...(await importOriginal()),
  requestSwapDepositAddress: vi.fn(),
  requestSwapParameterEncoding: vi.fn(),
}));

const client = initClient(createApiContract('mainnet'), {
  baseUrl: 'http://not-used.com',
  api: async (args: ApiFetcherArgs) => {
    let result;

    switch (args.route.method) {
      case 'GET':
        result = await request(server)
          .get(args.route.path)
          .set(args.headers || {});
        break;
      case 'POST':
        result = await request(server)
          .post(args.route.path)
          .send(args.body as string)
          .set(args.headers || {});
        break;

      default:
        throw new Error(`Unsupported method ${args.method}`);
    }

    return {
      status: result.statusCode,
      body: result.body,
      headers: new Headers(result.headers),
    };
  },
});

describe('openSwapDepositChannel', () => {
  let oldEnv: typeof env;

  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ['performance', 'Date'] }).setSystemTime(new Date('2022-01-01'));
    await prisma.$queryRaw`TRUNCATE TABLE "ChainTracking", "SwapDepositChannel", private."DepositChannel" CASCADE`;
    await prisma.chainTracking.create({
      data: {
        chain: 'Ethereum',
        height: BigInt('125'),
        blockTrackedAt: new Date('2023-11-09T10:00:00.000Z'),
        eventWitnessedBlock: 1,
      },
    });
  });

  beforeEach(async () => {
    vi.resetAllMocks();
    oldEnv = structuredClone(env);
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", private."DepositChannel" CASCADE`;
  });

  afterEach(() => {
    Object.assign(env, oldEnv);
  });

  it('creates channel and stores it in the database', async () => {
    mockRpcResponse({ data: environment() });
    vi.mocked(broker.requestSwapDepositAddress).mockResolvedValueOnce({
      sourceChainExpiryBlock: BigInt('1000'),
      address: 'address',
      channelId: 888,
      issuedBlock: 123,
      channelOpeningFee: 100n,
    });

    const result = await client.openSwapDepositChannel({
      body: {
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
      },
    });

    expect(result.body).toMatchInlineSnapshot(`
      {
        "brokerCommissionBps": 0,
        "channelOpeningFee": "100",
        "depositAddress": "address",
        "estimatedExpiryTime": 1699534500000,
        "id": "123-Ethereum-888",
        "issuedBlock": 123,
        "maxBoostFeeBps": 0,
        "srcChainExpiryBlock": "1000",
      }
    `);
    expect(vi.mocked(broker.requestSwapDepositAddress).mock.calls).toMatchSnapshot();
    expect(await prisma.swapDepositChannel.findFirst({ include: { quote: true } })).toMatchSnapshot(
      {
        id: expect.any(BigInt),
        createdAt: expect.any(Date),
      },
    );
  });

  it('creates channel and stores channel and quote in the database', async () => {
    mockRpcResponse({ data: environment() });
    vi.mocked(broker.requestSwapDepositAddress).mockResolvedValueOnce({
      sourceChainExpiryBlock: BigInt('1000'),
      address: 'address',
      channelId: 888,
      issuedBlock: 123,
      channelOpeningFee: 100n,
    });

    const result = await client.openSwapDepositChannel({
      body: {
        srcAsset: { asset: 'FLIP', chain: 'Ethereum' },
        destAsset: { asset: 'BTC', chain: 'Bitcoin' },
        destAddress: 'tb1pdz3akc5wa2gr69v3x87tfg0ka597dxqvfl6zhqx4y202y63cgw0q3rgpm6',
        amount: '1000',
        quote: {
          intermediateAmount: '500',
          egressAmount: '250',
          estimatedPrice: '0.375',
          recommendedSlippageTolerancePercent: 0.25,
          recommendedLivePriceSlippageTolerancePercent: 0.5,
        },
        fillOrKillParams: {
          maxOraclePriceSlippage: 50,
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          refundCcmMetadata: null,
          retryDurationBlocks: 2,
          minPriceX128: '1',
        },
      },
    });

    expect(result.body).toMatchInlineSnapshot(`
      {
        "brokerCommissionBps": 0,
        "channelOpeningFee": "100",
        "depositAddress": "address",
        "estimatedExpiryTime": 1699534500000,
        "id": "123-Ethereum-888",
        "issuedBlock": 123,
        "maxBoostFeeBps": 0,
        "srcChainExpiryBlock": "1000",
      }
    `);
    expect(vi.mocked(broker.requestSwapDepositAddress).mock.calls).toMatchSnapshot();
    expect(await prisma.swapDepositChannel.findFirst({ include: { quote: true } })).toMatchSnapshot(
      {
        id: expect.any(BigInt),
        createdAt: expect.any(Date),
        quote: {
          id: expect.any(Number),
          swapDepositChannelId: expect.any(BigInt),
        },
      },
    );
  });

  it('creates channel with boost and dca and stores quote in the database', async () => {
    mockRpcResponse({ data: environment() });
    vi.mocked(broker.requestSwapDepositAddress).mockResolvedValueOnce({
      sourceChainExpiryBlock: BigInt('1000'),
      address: 'address',
      channelId: 888,
      issuedBlock: 123,
      channelOpeningFee: 100n,
    });

    const result = await client.openSwapDepositChannel({
      body: {
        srcAsset: { asset: 'FLIP', chain: 'Ethereum' },
        destAsset: { asset: 'BTC', chain: 'Bitcoin' },
        destAddress: 'tb1pdz3akc5wa2gr69v3x87tfg0ka597dxqvfl6zhqx4y202y63cgw0q3rgpm6',
        amount: '1000',
        maxBoostFeeBps: 100,
        fillOrKillParams: {
          maxOraclePriceSlippage: null,
          retryDurationBlocks: 500,
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          refundCcmMetadata: null,
          minPriceX128: '1094494073153147181099038525207',
        },
        dcaParams: {
          chunkIntervalBlocks: 2,
          numberOfChunks: 3,
        },
        quote: {
          intermediateAmount: '500',
          egressAmount: '250',
          estimatedPrice: '0.32820704083381790449',
        },
      },
    });

    expect(result.body).toMatchInlineSnapshot(`
      {
        "brokerCommissionBps": 0,
        "channelOpeningFee": "100",
        "depositAddress": "address",
        "estimatedExpiryTime": 1699534500000,
        "id": "123-Ethereum-888",
        "issuedBlock": 123,
        "maxBoostFeeBps": 100,
        "srcChainExpiryBlock": "1000",
      }
    `);
    expect(vi.mocked(broker.requestSwapDepositAddress).mock.calls).toMatchSnapshot();
    expect(await prisma.swapDepositChannel.findFirst({ include: { quote: true } })).toMatchSnapshot(
      {
        id: expect.any(BigInt),
        createdAt: expect.any(Date),
        quote: {
          id: expect.any(Number),
          swapDepositChannelId: expect.any(BigInt),
        },
      },
    );
  });

  it('creates channel with ccmParams and stores it in the database', async () => {
    mockRpcResponse({ data: environment() });
    vi.mocked(broker.requestSwapDepositAddress).mockResolvedValueOnce({
      sourceChainExpiryBlock: BigInt('1000'),
      address: 'address',
      channelId: 909,
      issuedBlock: 123,
      channelOpeningFee: 10n,
    });

    const result = await client.openSwapDepositChannel({
      body: {
        srcAsset: { asset: 'FLIP', chain: 'Ethereum' },
        destAsset: { asset: 'USDC', chain: 'Ethereum' },
        destAddress: '0xFcd3C82b154CB4717Ac98718D0Fd13EEBA3D2754',
        amount: '10101010',
        ccmParams: {
          message: '0xdeadc0de',
          gasBudget: `0x${(125000).toString(16)}`,
          ccmAdditionalData: '0x',
        },
        fillOrKillParams: {
          maxOraclePriceSlippage: null,
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          refundCcmMetadata: null,
          retryDurationBlocks: 2,
          minPriceX128: '1',
        },
      },
    });

    expect(result.body).toMatchInlineSnapshot(`
      {
        "brokerCommissionBps": 0,
        "channelOpeningFee": "10",
        "depositAddress": "address",
        "estimatedExpiryTime": 1699534500000,
        "id": "123-Ethereum-909",
        "issuedBlock": 123,
        "maxBoostFeeBps": 0,
        "srcChainExpiryBlock": "1000",
      }
    `);
    expect(vi.mocked(broker.requestSwapDepositAddress).mock.calls).toMatchSnapshot();
    expect(await prisma.swapDepositChannel.findFirst()).toMatchSnapshot({
      id: expect.any(BigInt),
      createdAt: expect.any(Date),
    });
  });

  it('creates channel with fill or kill params and stores it in the database', async () => {
    mockRpcResponse({ data: environment() });
    vi.mocked(broker.requestSwapDepositAddress).mockResolvedValueOnce({
      sourceChainExpiryBlock: BigInt('1000'),
      address: 'address',
      channelId: 909,
      issuedBlock: 123,
      channelOpeningFee: 10n,
    });

    const result = await client.openSwapDepositChannel({
      body: {
        srcAsset: { asset: 'FLIP', chain: 'Ethereum' },
        destAsset: { asset: 'USDC', chain: 'Ethereum' },
        destAddress: '0xFcd3C82b154CB4717Ac98718D0Fd13EEBA3D2754',
        amount: '10101010',
        fillOrKillParams: {
          maxOraclePriceSlippage: 100,
          retryDurationBlocks: 500,
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          refundCcmMetadata: null,
          minPriceX128: '10000000000000',
        },
        dcaParams: {
          chunkIntervalBlocks: 2,
          numberOfChunks: 3,
        },
      },
    });

    expect(result.body).toMatchInlineSnapshot(`
      {
        "brokerCommissionBps": 0,
        "channelOpeningFee": "10",
        "depositAddress": "address",
        "estimatedExpiryTime": 1699534500000,
        "id": "123-Ethereum-909",
        "issuedBlock": 123,
        "maxBoostFeeBps": 0,
        "srcChainExpiryBlock": "1000",
      }
    `);
    expect(vi.mocked(broker.requestSwapDepositAddress).mock.calls).toMatchSnapshot();
    expect(await prisma.swapDepositChannel.findFirst()).toMatchSnapshot({
      id: expect.any(BigInt),
      createdAt: expect.any(Date),
    });
  });

  it('creates channel with boost fee and stores it in the database', async () => {
    mockRpcResponse({ data: environment() });
    vi.mocked(broker.requestSwapDepositAddress).mockResolvedValueOnce({
      sourceChainExpiryBlock: BigInt('1000'),
      address: 'address',
      channelId: 909,
      issuedBlock: 123,
      channelOpeningFee: 0n,
    });

    const result = await client.openSwapDepositChannel({
      body: {
        srcAsset: { asset: 'FLIP', chain: 'Ethereum' },
        destAsset: { asset: 'USDC', chain: 'Ethereum' },
        destAddress: '0xFcd3C82b154CB4717Ac98718D0Fd13EEBA3D2754',
        amount: '10101010',
        maxBoostFeeBps: 100,
        fillOrKillParams: {
          maxOraclePriceSlippage: 100,
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          refundCcmMetadata: null,
          retryDurationBlocks: 2,
          minPriceX128: '1',
        },
      },
    });

    expect(result.body).toMatchInlineSnapshot(`
      {
        "brokerCommissionBps": 0,
        "channelOpeningFee": "0",
        "depositAddress": "address",
        "estimatedExpiryTime": 1699534500000,
        "id": "123-Ethereum-909",
        "issuedBlock": 123,
        "maxBoostFeeBps": 100,
        "srcChainExpiryBlock": "1000",
      }
    `);
    expect(vi.mocked(broker.requestSwapDepositAddress).mock.calls).toMatchSnapshot();
    expect(await prisma.swapDepositChannel.findFirst()).toMatchSnapshot({
      id: expect.any(BigInt),
      createdAt: expect.any(Date),
      maxBoostFeeBps: 100,
    });
  });

  it('creates channel with a commission', async () => {
    mockRpcResponse({ data: environment() });
    env.BROKER_COMMISSION_BPS = 100;
    env.RPC_COMMISSION_BROKER_HTTPS_URL = 'https://broker-2.test';
    vi.mocked(broker.requestSwapDepositAddress).mockResolvedValueOnce({
      sourceChainExpiryBlock: BigInt('1000'),
      address: 'address',
      channelId: 888,
      issuedBlock: 123,
      channelOpeningFee: 100n,
    });

    const result = await client.openSwapDepositChannel({
      body: {
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
        takeCommission: true,
      },
    });

    expect(result.body).toMatchInlineSnapshot(`
      {
        "brokerCommissionBps": 100,
        "channelOpeningFee": "100",
        "depositAddress": "address",
        "estimatedExpiryTime": 1699534500000,
        "id": "123-Ethereum-888",
        "issuedBlock": 123,
        "maxBoostFeeBps": 0,
        "srcChainExpiryBlock": "1000",
      }
    `);
    expect(vi.mocked(broker.requestSwapDepositAddress).mock.calls).toMatchSnapshot();
    expect(await prisma.swapDepositChannel.findFirst({ include: { quote: true } })).toMatchSnapshot(
      {
        id: expect.any(BigInt),
        createdAt: expect.any(Date),
      },
    );
  });

  it('rejects if source asset is disabled', async () => {
    env.FULLY_DISABLED_INTERNAL_ASSETS = new Set(['Flip', 'Btc']);

    await expect(
      client.openSwapDepositChannel({
        body: {
          srcAsset: { asset: 'FLIP', chain: 'Ethereum' },
          destAsset: { asset: 'BTC', chain: 'Bitcoin' },
          destAddress: 'tb1pdz3akc5wa2gr69v3x87tfg0ka597dxqvfl6zhqx4y202y63cgw0q3rgpm6',
          amount: '777',
          fillOrKillParams: {
            maxOraclePriceSlippage: 100,
            refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
            refundCcmMetadata: null,
            retryDurationBlocks: 2,
            minPriceX128: '1',
          },
        },
      }),
    ).resolves.toMatchInlineSnapshot(`
      {
        "body": {
          "message": "Asset Flip is disabled",
        },
        "headers": Headers {},
        "status": 503,
      }
    `);
  });

  it('rejects if destination asset is disabled', async () => {
    env.FULLY_DISABLED_INTERNAL_ASSETS = new Set(['Btc']);

    await expect(
      client.openSwapDepositChannel({
        body: {
          srcAsset: { asset: 'FLIP', chain: 'Ethereum' },
          destAsset: { asset: 'BTC', chain: 'Bitcoin' },
          destAddress: 'tb1pdz3akc5wa2gr69v3x87tfg0ka597dxqvfl6zhqx4y202y63cgw0q3rgpm6',
          amount: '777',
          fillOrKillParams: {
            maxOraclePriceSlippage: 100,
            refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
            refundCcmMetadata: null,
            retryDurationBlocks: 2,
            minPriceX128: '1',
          },
        },
      }),
    ).resolves.toMatchInlineSnapshot(`
      {
        "body": {
          "message": "Asset Btc is disabled",
        },
        "headers": Headers {},
        "status": 503,
      }
    `);
  });

  it('rejects if too many channels are open', async () => {
    env.MAX_CHANNELS_OPEN_PER_ADDRESS = 5;

    const opts = {
      body: {
        srcAsset: { asset: 'FLIP', chain: 'Ethereum' },
        destAsset: { asset: 'ETH', chain: 'Ethereum' },
        destAddress: '0x72a5843cc08275C8171E582972Aa4fDa8C397B2A',
        amount: '777',
        fillOrKillParams: {
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          refundCcmMetadata: null,
          retryDurationBlocks: 2,
          minPriceX128: '1',
          maxOraclePriceSlippage: null,
        },
      },
    } as const;

    mockRpcResponse({ data: environment() });

    let channelId = 0;
    vi.mocked(broker.requestSwapDepositAddress).mockImplementation(async () =>
      Promise.resolve({
        sourceChainExpiryBlock: BigInt('1000'),
        address: `address${++channelId}`, // eslint-disable-line no-plusplus
        channelId: 888,
        issuedBlock: 123 + channelId,
        channelOpeningFee: 100n,
      }),
    );

    for (let i = 0; i < 5; i += 1) {
      await expect(client.openSwapDepositChannel(opts)).resolves.not.toThrow();
    }

    await expect(client.openSwapDepositChannel({ ...opts })).resolves.toMatchInlineSnapshot(`
      {
        "body": {
          "message": "too many channels",
        },
        "headers": Headers {},
        "status": 400,
      }
    `);

    await expect(
      client.openSwapDepositChannel({
        body: { ...opts.body, destAddress: opts.body.destAddress.toLowerCase() },
      }),
    ).resolves.toMatchInlineSnapshot(`
      {
        "body": {
          "message": "too many channels",
        },
        "headers": Headers {},
        "status": 400,
      }
    `);
  });

  it('rejects if too many channels with same ccm message are open', async () => {
    env.MAX_CHANNELS_OPEN_PER_ADDRESS = 5;

    const opts = {
      body: {
        srcAsset: { asset: 'FLIP', chain: 'Ethereum' },
        destAsset: { asset: 'ETH', chain: 'Ethereum' },
        destAddress: '0x72a5843cc08275C8171E582972Aa4fDa8C397B2A',
        amount: '777',
        fillOrKillParams: {
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          refundCcmMetadata: null,
          retryDurationBlocks: 2,
          minPriceX128: '1',
          maxOraclePriceSlippage: null,
        },
        ccmParams: {
          message: '0xdeadbeef',
          gasBudget: '0x1000',
          ccmAdditionalData: '0x',
        },
      },
    } as const;

    mockRpcResponse({ data: environment() });

    let channelId = 0;
    vi.mocked(broker.requestSwapDepositAddress).mockImplementation(async () =>
      Promise.resolve({
        sourceChainExpiryBlock: BigInt('1000'),
        address: `address${++channelId}`, // eslint-disable-line no-plusplus
        channelId: 888,
        issuedBlock: 123 + channelId,
        channelOpeningFee: 100n,
      }),
    );

    for (let i = 0; i < 5; i += 1) {
      await expect(client.openSwapDepositChannel(opts)).resolves.not.toThrow();
    }

    await expect(client.openSwapDepositChannel({ ...opts })).resolves.toMatchInlineSnapshot(`
      {
        "body": {
          "message": "too many channels",
        },
        "headers": Headers {},
        "status": 400,
      }
    `);

    // accepts channel with different message
    await expect(
      client.openSwapDepositChannel({
        body: {
          ...opts.body,
          ccmParams: { ...opts.body.ccmParams, message: `0xc0ffee` },
        },
      }),
    ).resolves.not.toThrow();
  });
});

describe('encodeVaultSwapData', () => {
  let oldEnv: typeof env;

  beforeEach(async () => {
    vi.resetAllMocks();
    oldEnv = structuredClone(env);
  });

  afterEach(() => {
    Object.assign(env, oldEnv);
  });

  it('calls the broker api with the correct params', async () => {
    const postSpy = mockRpcResponse((url, data: any) => {
      if (data.method === 'cf_environment') {
        return Promise.resolve({ data: environment({ maxSwapAmount: '0x10000000000' }) });
      }

      if (data.method === 'broker_request_swap_parameter_encoding') {
        return Promise.resolve({
          data: {
            id: '1',
            jsonrpc: '2.0',
            result: {
              chain: 'Bitcoin',
              nulldata_payload:
                '0x0003656623d865425c0a4955ef7e7a39d09f58554d0800000000000000000000000000000000000001000200000100',
              deposit_address: 'bcrt1pmrhjpvq2w7cgesrcrvuhqw6n6j487l6uc7tmwtx9jen7ezesunhqllvzxx',
            },
          },
        });
      }

      throw new Error(`unexpected axios call to ${url}: ${JSON.stringify(data)}`);
    });

    const result = await client.encodeVaultSwapData({
      body: {
        srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
        destAsset: { asset: 'ETH', chain: 'Ethereum' },
        destAddress: '0xe983fD1798689eee00c0Fb77e79B8f372DF41060',
        amount: '12500000',
        commissionBps: 0,
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: 'tb1pdz3akc5wa2gr69v3x87tfg0ka597dxqvfl6zhqx4y202y63cgw0q3rgpm6',
          refundCcmMetadata: null,
          minPriceX128: 0x152d02c7e14af680000000000000000000000000000000000000n.toString(),
          maxOraclePriceSlippage: null,
        },
        ccmParams: {
          gasBudget: '0x75bcd15',
          message: '0xdeadc0de',
          ccmAdditionalData: '0x',
        },
        maxBoostFeeBps: 35,
        affiliates: [
          {
            account: 'cFHyJEHEQ1YkT9xuFnxnPWVkihpYEGjBg4WbF6vCPtSPQoE8n',
            commissionBps: 10,
          },
        ],
        dcaParams: {
          numberOfChunks: 100,
          chunkIntervalBlocks: 5,
        },
      },
    });

    expect(result.status).toBe(200);

    expect(postSpy).toHaveBeenNthCalledWith(2, 'https://rpc-broker.test', [
      {
        id: expect.any(String),
        jsonrpc: '2.0',
        method: 'broker_request_swap_parameter_encoding',
        params: [
          {
            asset: 'BTC',
            chain: 'Bitcoin',
          },
          {
            asset: 'ETH',
            chain: 'Ethereum',
          },
          '0xe983fD1798689eee00c0Fb77e79B8f372DF41060',
          0, // ignores commission
          {
            chain: 'Bitcoin',
            max_oracle_price_slippage: null,
            min_output_amount: '0xfc6f7c40458122964d0000000',
            retry_duration: 500,
          },
          {
            gas_budget: '0x75bcd15',
            message: '0xdeadc0de',
            ccm_additional_data: '0x',
          },
          35,
          null, // ignores affiliates
          {
            chunk_interval: 5,
            number_of_chunks: 100,
          },
        ],
      },
    ]);
    expect(result.body).toEqual({
      chain: 'Bitcoin',
      nulldataPayload:
        '0x0003656623d865425c0a4955ef7e7a39d09f58554d0800000000000000000000000000000000000001000200000100',
      depositAddress: 'bcrt1pmrhjpvq2w7cgesrcrvuhqw6n6j487l6uc7tmwtx9jen7ezesunhqllvzxx',
    });
  });

  it('calls the node rpc with the correct params if broker account is given', async () => {
    const postSpy = mockRpcResponse((url, data: any) => {
      if (data.method === 'cf_environment') {
        return Promise.resolve({ data: environment({ maxSwapAmount: '0x10000000000' }) });
      }

      if (data.method === 'cf_request_swap_parameter_encoding') {
        return Promise.resolve({
          data: {
            id: '1',
            jsonrpc: '2.0',
            result: {
              chain: 'Bitcoin',
              nulldata_payload:
                '0x0003656623d865425c0a4955ef7e7a39d09f58554d0800000000000000000000000000000000000001000200000100',
              deposit_address: 'bcrt1pmrhjpvq2w7cgesrcrvuhqw6n6j487l6uc7tmwtx9jen7ezesunhqllvzxx',
            },
          },
        });
      }

      throw new Error(`unexpected axios call to ${url}: ${JSON.stringify(data)}`);
    });

    const result = await client.encodeVaultSwapData({
      body: {
        srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
        destAsset: { asset: 'ETH', chain: 'Ethereum' },
        destAddress: '0xe983fD1798689eee00c0Fb77e79B8f372DF41060',
        amount: '12500000',
        brokerAccount: 'cFLdocJo3bjT7JbT7R46cA89QfvoitrKr9P3TsMcdkVWeeVLa',
        commissionBps: 15,
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: 'tb1pdz3akc5wa2gr69v3x87tfg0ka597dxqvfl6zhqx4y202y63cgw0q3rgpm6',
          refundCcmMetadata: null,
          minPriceX128: 0x152d02c7e14af680000000000000000000000000000000000000n.toString(),
          maxOraclePriceSlippage: 50,
        },
        ccmParams: {
          gasBudget: '0x75bcd15',
          message: '0xdeadc0de',
          ccmAdditionalData: '0x',
        },
        maxBoostFeeBps: 35,
        affiliates: [
          {
            account: 'cFHyJEHEQ1YkT9xuFnxnPWVkihpYEGjBg4WbF6vCPtSPQoE8n',
            commissionBps: 10,
          },
        ],
        dcaParams: {
          numberOfChunks: 100,
          chunkIntervalBlocks: 5,
        },
      },
    });

    expect(result.status).toBe(200);

    expect(postSpy).toHaveBeenNthCalledWith(2, 'http://rpc-node.test', [
      {
        id: expect.any(String),
        jsonrpc: '2.0',
        method: 'cf_request_swap_parameter_encoding',
        params: [
          'cFLdocJo3bjT7JbT7R46cA89QfvoitrKr9P3TsMcdkVWeeVLa',
          {
            asset: 'BTC',
            chain: 'Bitcoin',
          },
          {
            asset: 'ETH',
            chain: 'Ethereum',
          },
          '0xe983fD1798689eee00c0Fb77e79B8f372DF41060',
          15,
          {
            chain: 'Bitcoin',
            max_oracle_price_slippage: 50,
            min_output_amount: '0xfc6f7c40458122964d0000000',
            retry_duration: 500,
          },
          {
            gas_budget: '0x75bcd15',
            message: '0xdeadc0de',
            ccm_additional_data: '0x',
          },
          35,
          [
            {
              account: 'cFHyJEHEQ1YkT9xuFnxnPWVkihpYEGjBg4WbF6vCPtSPQoE8n',
              bps: 10,
            },
          ],
          {
            chunk_interval: 5,
            number_of_chunks: 100,
          },
        ],
      },
    ]);
    expect(result.body).toEqual({
      chain: 'Bitcoin',
      nulldataPayload:
        '0x0003656623d865425c0a4955ef7e7a39d09f58554d0800000000000000000000000000000000000001000200000100',
      depositAddress: 'bcrt1pmrhjpvq2w7cgesrcrvuhqw6n6j487l6uc7tmwtx9jen7ezesunhqllvzxx',
    });
  });

  it('rejects if source asset is disabled', async () => {
    env.FULLY_DISABLED_INTERNAL_ASSETS = new Set(['Flip', 'Btc']);

    await expect(
      client.encodeVaultSwapData({
        body: {
          srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
          destAsset: { asset: 'ETH', chain: 'Ethereum' },
          destAddress: '0xe983fD1798689eee00c0Fb77e79B8f372DF41060',
          amount: '175000000',
          commissionBps: 15,
          fillOrKillParams: {
            retryDurationBlocks: 500,
            refundAddress: 'tb1pdz3akc5wa2gr69v3x87tfg0ka597dxqvfl6zhqx4y202y63cgw0q3rgpm6',
            refundCcmMetadata: null,
            minPriceX128: 0x152d02c7e14af680000000000000000000000000000000000000n.toString(),
            maxOraclePriceSlippage: 50,
          },
        },
      }),
    ).resolves.toMatchInlineSnapshot(`
      {
        "body": {
          "message": "Asset Btc is disabled",
        },
        "headers": Headers {},
        "status": 503,
      }
    `);
  });

  it('rejects if destination asset is disabled', async () => {
    env.FULLY_DISABLED_INTERNAL_ASSETS = new Set(['Btc', 'HubDot']);

    await expect(
      client.encodeVaultSwapData({
        body: {
          srcAsset: { asset: 'ETH', chain: 'Ethereum' },
          destAsset: { asset: 'DOT', chain: 'Assethub' },
          destAddress: '1yMmfLti1k3huRQM2c47WugwonQMqTvQ2GUFxnU7Pcs7xPo',
          amount: '175000000',
          commissionBps: 15,
          fillOrKillParams: {
            retryDurationBlocks: 500,
            refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
            refundCcmMetadata: null,
            minPriceX128: 0x152d02c7e14af680000000000000000000000000000000000000n.toString(),
            maxOraclePriceSlippage: 50,
          },
        },
      }),
    ).resolves.toMatchInlineSnapshot(`
      {
        "body": {
          "message": "Asset HubDot is disabled",
        },
        "headers": Headers {},
        "status": 503,
      }
    `);
  });
});

describe('openAccountCreationDepositChannel', () => {
  type ChannelInfo = Awaited<
    ReturnType<
      typeof HttpClient.prototype.sendRequest<'broker_request_account_creation_deposit_address'>
    >
  >;

  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "AccountCreationDepositChannel" CASCADE`;
  });

  it('opens account creation deposit channel', async () => {
    const response: ChannelInfo = {
      issued_block: 53948,
      channel_id: 3,
      address: '0xc2774b2f1972f50ac6113e81721cc7214388434d',
      requested_for: 'cFHsUq1uK5opJudRDczt7w4baiRDHR6Kdezw77u2JnRnCGKcs',
      deposit_chain_expiry_block: 27208n,
      channel_opening_fee: 0n,
      refund_address: '0x10C6E9530F1C1AF873a391030a1D9E8ed0630D26',
    };

    const spy = vi.spyOn(HttpClient.prototype, 'sendRequest').mockResolvedValueOnce(response);

    const result = await client.openAccountCreationDepositChannel({
      body: {
        asset: { asset: 'ETH', chain: 'Ethereum' },
        refundAddress: '0x10C6E9530F1C1AF873a391030a1D9E8ed0630D26',
        signatureData: {
          Ethereum: {
            signature: '0x1234567890',
            signer: '0x10C6E9530F1C1AF873a391030a1D9E8ed0630D26',
            sigType: 'Eip712',
          },
        },
        transactionMetadata: {
          nonce: 0,
          expiryBlock: 55000,
        },
        boostFeeBps: 30,
      },
    });

    expect(result.status).toBe(201);
    expect(result.body).toMatchInlineSnapshot(`
      {
        "brokerCommissionBps": 0,
        "channelOpeningFee": "0",
        "depositAddress": "0xc2774b2f1972f50ac6113e81721cc7214388434d",
        "id": "53948-Ethereum-3",
        "issuedBlock": 53948,
        "maxBoostFeeBps": 30,
        "srcChainExpiryBlock": "27208",
      }
    `);
    expect(spy.mock.calls).toMatchInlineSnapshot(`
      [
        [
          "broker_request_account_creation_deposit_address",
          {
            "Ethereum": {
              "sig_type": "Eip712",
              "signature": "0x1234567890",
              "signer": "0x10C6E9530F1C1AF873a391030a1D9E8ed0630D26",
            },
          },
          {
            "expiry_block": 55000,
            "nonce": 0,
          },
          {
            "asset": "ETH",
            "chain": "Ethereum",
          },
          30,
          "0x10C6E9530F1C1AF873a391030a1D9E8ed0630D26",
        ],
      ]
    `);
  });
});
