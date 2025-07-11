import { hexEncodeNumber } from '@chainflip/utils/number';
import axios from 'axios';
import { spawn, ChildProcessWithoutNullStreams, exec } from 'child_process';
import * as crypto from 'crypto';
import { on, once } from 'events';
import { AddressInfo } from 'net';
import * as path from 'path';
import { Observable, filter, firstValueFrom, from, map, shareReplay, timeout } from 'rxjs';
import { promisify } from 'util';
import { vi, describe, it, beforeAll, beforeEach, afterEach, expect } from 'vitest';
import { QuoteQueryParams } from '@/shared/schemas.js';
import {
  boostPoolsDepth,
  cfAccountInfo,
  cfPoolDepth,
  environment,
  mockRpcResponse,
} from '@/shared/tests/fixtures.js';
import prisma from '../client.js';
import app from '../server.js';
import { getTotalLiquidity } from '../utils/pools.js';
import { getSwapRateV3 } from '../utils/statechain.js';

const execAsync = promisify(exec);
global.fetch = vi.fn().mockRejectedValue(new Error('fetch is not implemented in this environment'));

vi.mock('../pricing.js');
vi.mock('../utils/pools.js', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    getTotalLiquidity: vi.fn(),
  };
});

vi.mock('../utils/statechain.js', () => ({
  getSwapRateV3: vi.fn().mockImplementation(() => Promise.reject(new Error('unexpected call'))),
}));
vi.mock('../polkadot/api.js', () => ({
  getBoostSafeMode: vi.fn().mockResolvedValue(true),
}));

const generateKeyPairAsync = promisify(crypto.generateKeyPair);

describe('python integration test', () => {
  vi.setConfig({
    testTimeout: 10000,
  });

  let privateKey: string;
  const accountId = 'web_team_whales';
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
    vi.clearAllMocks();
    mockRpcResponse((url, data) => {
      if (data.method === 'cf_environment') {
        return Promise.resolve({
          data: environment({
            maxSwapAmount: null,
            ingressFee: hexEncodeNumber(2000000),
            egressFee: hexEncodeNumber(50000),
          }),
        });
      }

      if (data.method === 'cf_boost_pools_depth') {
        return Promise.resolve({ data: boostPoolsDepth([]) });
      }

      if (data.method === 'cf_pool_depth') {
        return Promise.resolve({
          data: cfPoolDepth(),
        });
      }

      if (data.method === 'cf_accounts') {
        return Promise.resolve({
          data: {
            id: 1,
            jsonrpc: '2.0',
            result: [
              ['cFMYYJ9F1r1pRo3NBbnQDVRVRwY9tYem39gcfKZddPjvfsFfH', 'Chainflip Testnet Broker 2'],
            ],
          },
        });
      }

      if (data.method === 'cf_account_info') {
        return Promise.resolve({
          data: cfAccountInfo(),
        });
      }

      throw new Error(`unexpected axios call to ${url}: ${JSON.stringify(data)}`);
    });

    await prisma.$queryRaw`TRUNCATE TABLE private."MarketMaker" CASCADE`;
    const pair = await generateKeyPairAsync('ed25519');
    privateKey = pair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    await prisma.marketMaker.create({
      data: {
        name: accountId,
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
      '--account-id',
      accountId,
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

  it('replies to a quote request with v2 endpoint', async () => {
    await expectMesage('connected');

    const query = {
      srcAsset: 'FLIP',
      srcChain: 'Ethereum',
      destAsset: 'USDC',
      destChain: 'Ethereum',
      amount: '1000000000000000000',
    } as QuoteQueryParams;
    const params = new URLSearchParams(query as Record<string, any>);

    vi.mocked(getTotalLiquidity)
      .mockResolvedValueOnce(9997901209876966295n)
      .mockResolvedValueOnce(9997901209876966295n);

    vi.mocked(getSwapRateV3).mockResolvedValueOnce({
      ingressFee: { amount: 2000000n, chain: 'Ethereum', asset: 'FLIP' },
      networkFee: { amount: 998900109987003n, chain: 'Ethereum', asset: 'USDC' },
      egressFee: { amount: 50000n, chain: 'Ethereum', asset: 'USDC' },
      intermediateAmount: 2000000000n,
      egressAmount: 997901209876966295n,
      brokerFee: {
        chain: 'Ethereum',
        asset: 'USDC',
        amount: 0n,
      },
    });

    const response = await axios.get(`${serverUrl}/v2/quote?${params.toString()}`, {
      validateStatus: () => true,
    });

    expect(await response.data).toMatchSnapshot();
    expect(vi.mocked(getSwapRateV3).mock.calls).toMatchSnapshot();
  });
});
