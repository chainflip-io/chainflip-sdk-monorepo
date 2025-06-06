/* eslint-disable dot-notation */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import env from '../../config/env.js';
import { getUsdValue } from '../../pricing/checkPriceWarning.js';
import QuoteRequest, { MAX_NUMBER_OF_CHUNKS } from '../QuoteRequest.js';

const originalEnv = structuredClone(env);

vi.mock('../../pricing/checkPriceWarning', () => ({
  checkPriceWarning: vi.fn(),
  getUsdValue: vi.fn().mockResolvedValue(undefined),
}));

describe(QuoteRequest.prototype['setDcaQuoteParams'], () => {
  const createRequest = (amount: bigint) =>
    new QuoteRequest({} as any, {
      srcAsset: 'Btc',
      destAsset: 'Flip',
      amount,
      brokerCommissionBps: 0,
      ccmParams: undefined,
      dcaEnabled: true,
      isOnChain: false,
      isVaultSwap: false,
      pools: [],
    });

  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(env, originalEnv);
    env.DCA_CHUNK_SIZE_USD = { Btc: 3000 };
    env.DCA_CHUNK_INTERVAL_BLOCKS = 2;
    env.DCA_DEFAULT_CHUNK_SIZE_USD = 2000;
  });

  it('should correctly return 9060 usd worth of btc', async () => {
    vi.mocked(getUsdValue).mockResolvedValue('9060');

    const request = createRequest(27180n);
    await request['setDcaQuoteParams']();
    expect(request['dcaQuoteParams']).toMatchInlineSnapshot(`
      {
        "additionalSwapDurationSeconds": 36,
        "chunkIntervalBlocks": 2,
        "chunkSize": 6795n,
        "numberOfChunks": 4,
      }
    `);
  });

  it('should correctly return 9300 usd worth of btc', async () => {
    vi.mocked(getUsdValue).mockResolvedValue('9300');

    const request = createRequest(27900n);
    await request['setDcaQuoteParams']();
    expect(request['dcaQuoteParams']).toMatchInlineSnapshot(`
      {
        "additionalSwapDurationSeconds": 36,
        "chunkIntervalBlocks": 2,
        "chunkSize": 6975n,
        "numberOfChunks": 4,
      }
    `);
  });

  it('should correctly handle 300 usd worth of btc', async () => {
    vi.mocked(getUsdValue).mockResolvedValue('300');

    const request = createRequest(900n);
    await request['setDcaQuoteParams']();
    expect(request['dcaQuoteParams']).toEqual(null);
  });

  it('should correctly handle 30 usd worth of btc', async () => {
    vi.mocked(getUsdValue).mockResolvedValue('30');

    const request = createRequest(90n);
    await request['setDcaQuoteParams']();
    expect(request['dcaQuoteParams']).toEqual(null);
  });

  it('should correctly handle number of chunks bigger than max', async () => {
    const chunkSizeUsd = BigInt(env.DCA_CHUNK_SIZE_USD?.Btc ?? env.DCA_DEFAULT_CHUNK_SIZE_USD);
    const maxUsdValue = BigInt(MAX_NUMBER_OF_CHUNKS) * chunkSizeUsd + 1n;
    vi.mocked(getUsdValue).mockResolvedValue(maxUsdValue.toString());

    const request = createRequest(1n);
    await request['setDcaQuoteParams']();
    expect(request['dcaQuoteParams']).toEqual(null);
  });
});
