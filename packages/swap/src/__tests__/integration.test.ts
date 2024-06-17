import { spawn, ChildProcessWithoutNullStreams, exec } from 'child_process';
import * as crypto from 'crypto';
import { on, once } from 'events';
import { AddressInfo } from 'net';
import * as path from 'path';
import { Observable, filter, firstValueFrom, from, map, shareReplay, timeout } from 'rxjs';
import { promisify } from 'util';
import { Assets, Chains, InternalAssets } from '@/shared/enums';
import { QuoteQueryParams } from '@/shared/schemas';
import { environment, swapRate } from '@/shared/tests/fixtures';
import prisma, { InternalAsset } from '../client';
import PoolStateCache from '../quoting/PoolStateCache';
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

    throw new Error(`unexpected axios call to ${url}: ${JSON.stringify(data)}`);
  }),
}));

jest.mock('../quoting/PoolStateCache');

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
    await prisma.$queryRaw`TRUNCATE TABLE public."Pool", private."QuotingPair" CASCADE`;
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
    const assets = Object.keys(InternalAssets) as InternalAsset[];

    await prisma.quotingPair.createMany({
      data: assets.flatMap((fromAsset) =>
        assets.map((to) => ({ from: fromAsset, to, enabled: true })),
      ),
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
    expect(jest.mocked(PoolStateCache.prototype.start)).toHaveBeenCalled();

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
      outputAmount: 100000000n, // this shouldn't be the result
      quoteType: 'pool',
    });
    jest.mocked(PoolStateCache.prototype.getPoolState).mockResolvedValueOnce({
      poolState: JSON.stringify({
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
      rangeOrderPrice: 0x1000276a3n,
    });

    const response = await fetch(`${serverUrl}/quote?${params.toString()}`);

    expect(await response.json()).toMatchSnapshot();
  });
});
