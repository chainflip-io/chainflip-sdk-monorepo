import { spawn, ChildProcessWithoutNullStreams, exec } from 'child_process';
import * as crypto from 'crypto';
import { on, once } from 'events';
import { AddressInfo } from 'net';
import * as path from 'path';
import { Observable, filter, firstValueFrom, from, map, shareReplay, timeout } from 'rxjs';
import { promisify } from 'util';
import { Assets, Chains } from '@/shared/enums';
import { QuoteQueryParams } from '@/shared/schemas';
import { environment, swapRate } from '@/shared/tests/fixtures';
import prisma from '../client';
import app from '../server';
import { getSwapRate } from '../utils/statechain';

const execAsync = promisify(exec);

jest.mock('../pricing');

jest.mock('../utils/statechain', () => ({
  getSwapRate: jest.fn().mockImplementation(() => Promise.reject(new Error('unexpected call'))),
}));

jest.mock('axios', () => ({
  get: jest.fn(),
  create() {
    return this;
  },
  post: jest.fn((url, data) => {
    if (data.method === 'cf_environment') {
      return Promise.resolve({
        data: environment({
          maxSwapAmount: null,
          ingressFee: '2000000',
          egressFee: '50000',
        }),
      });
    }

    if (data.method === 'cf_swap_rate') {
      return Promise.resolve({
        data: swapRate({
          output: `0x${(BigInt(data.params[2]) * 2n).toString(16)}`,
        }),
      });
    }

    if (data.method === 'cf_pool_orders') {
      return {
        data: JSON.stringify({
          jsonrpc: '2.0',
          result: {
            limit_orders: {
              asks: [],
              bids: [],
            },
            range_orders: [],
          },
          id: 1,
        }),
      };
    }

    if (data.method === 'cf_pool_price_v2') {
      return {
        data: {
          result: { range_order: '0x1000276a3' },
        },
      };
    }

    throw new Error(`unexpected axios call to ${url}: ${JSON.stringify(data)}`);
  }),
}));

const generateKeyPairAsync = promisify(crypto.generateKeyPair);

describe('python integration test', () => {
  jest.setTimeout(10000);

  let privateKey: string;
  const marketMakerId = 'web_team_whales';
  let server: typeof app;
  let child: ChildProcessWithoutNullStreams;
  let stdout$: Observable<string>;
  let serverUrl: string;

  beforeAll(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE public."Pool" CASCADE`;
    await prisma.pool.createMany({
      data: [
        {
          baseAsset: 'Flip',
          quoteAsset: 'Usdc',
          liquidityFeeHundredthPips: 1000,
        },
        {
          baseAsset: 'Eth',
          quoteAsset: 'Usdc',
          liquidityFeeHundredthPips: 2000,
        },
      ],
    });
  });

  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE private."MarketMaker" CASCADE`;
    const pair = await generateKeyPairAsync('ed25519');
    privateKey = pair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    await prisma.marketMaker.create({
      data: {
        name: marketMakerId,
        publicKey: pair.publicKey.export({ type: 'spki', format: 'pem' }).toString(),
      },
    });
    server = app.listen(0);
    serverUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    const exeName = await Promise.any([
      execAsync('python --version').then(() => 'python'),
      execAsync('python3 --version').then(() => 'python3'),
    ]);

    child = spawn(exeName, [
      path.join(__dirname, '..', '..', 'python-client', 'mock.py'),
      '--private-key',
      privateKey,
      '--market-maker-id',
      marketMakerId,
      '--url',
      serverUrl,
    ]);

    stdout$ = from(on(child.stdout, 'data')).pipe(
      map((buffer) => buffer.toString().trim()),
      shareReplay(),
    );
  });

  afterEach(async () => {
    if (child.exitCode === null) {
      child.kill('SIGINT');
      await once(child, 'exit');
    }
    await promisify(server.close).bind(server)();
  });

  const expectMesage = async (message: string) => {
    if (child.exitCode !== null) {
      throw new Error('child process exited unexpectedly');
    }

    await expect(
      Promise.race([
        firstValueFrom(
          stdout$.pipe(
            filter((msg) => msg === message),
            timeout(10000),
          ),
        ),
        once(child, 'close').then(() => Promise.reject(Error('child process exited unexpectedly'))),
      ]),
    ).resolves.toBe(message);
  };

  it('replies to a quote request', async () => {
    await expectMesage('connected');

    const query = {
      srcAsset: Assets.FLIP,
      srcChain: Chains.Ethereum,
      destAsset: Assets.USDC,
      destChain: Chains.Ethereum,
      amount: '1000000000000000000',
    } as QuoteQueryParams;
    const params = new URLSearchParams(query as Record<string, any>);

    jest.mocked(getSwapRate).mockResolvedValueOnce({
      intermediateAmount: 2000000000n,
      outputAmount: 0n, // this shouldn't be the result
      quoteType: 'pool',
    });

    const response = await fetch(`${serverUrl}/quote?${params.toString()}`);

    expect(await response.json()).toMatchSnapshot();
  });
});
