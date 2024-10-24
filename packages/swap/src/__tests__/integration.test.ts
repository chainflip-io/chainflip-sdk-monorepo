import { hexEncodeNumber } from '@chainflip/utils/number';
import axios from 'axios';
import { spawn, ChildProcessWithoutNullStreams, exec } from 'child_process';
import * as crypto from 'crypto';
import { on, once } from 'events';
import { AddressInfo } from 'net';
import * as path from 'path';
import { Observable, filter, firstValueFrom, from, map, shareReplay, timeout } from 'rxjs';
import { promisify } from 'util';
import { Assets, Chains } from '@/shared/enums';
import { QuoteQueryParams } from '@/shared/schemas';
import { boostPoolsDepth, environment, mockRpcResponse } from '@/shared/tests/fixtures';
import prisma from '../client';
import app from '../server';
import { getSwapRateV2 } from '../utils/statechain';

const execAsync = promisify(exec);

jest.mock('../pricing');

jest.mock('../utils/statechain', () => ({
  getSwapRateV2: jest.fn().mockImplementation(() => Promise.reject(new Error('unexpected call'))),
}));

const generateKeyPairAsync = promisify(crypto.generateKeyPair);

describe('python integration test', () => {
  jest.setTimeout(10000);

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

    jest.mocked(getSwapRateV2).mockResolvedValueOnce({
      ingressFee: { amount: 2000000n, chain: 'Ethereum', asset: 'FLIP' },
      networkFee: { amount: 998900109987003n, chain: 'Ethereum', asset: 'USDC' },
      egressFee: { amount: 50000n, chain: 'Ethereum', asset: 'USDC' },
      intermediateAmount: 2000000000n,
      egressAmount: 997901209876966295n,
      brokerFee: 0n,
    });

    const response = await axios.get(`${serverUrl}/quote?${params.toString()}`);

    expect(await response.data).toMatchSnapshot();
    expect(jest.mocked(getSwapRateV2).mock.calls).toMatchSnapshot();
  });
});
