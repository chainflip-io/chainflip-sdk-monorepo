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

describe(QuoteRequest.prototype['setDcaQuoteParams'], () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(env, originalEnv);
    env.DCA_SELL_CHUNK_SIZE_USD = { Btc: 3000 };
    env.DCA_CHUNK_INTERVAL_BLOCKS = 2;
    env.DCA_DEFAULT_SELL_CHUNK_SIZE_USD = 2000;
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
    const chunkSizeUsd = BigInt(
      env.DCA_SELL_CHUNK_SIZE_USD?.Btc ?? env.DCA_DEFAULT_SELL_CHUNK_SIZE_USD,
    );
    const maxUsdValue = BigInt(MAX_NUMBER_OF_CHUNKS) * chunkSizeUsd + 1n;
    vi.mocked(getUsdValue).mockResolvedValue(maxUsdValue.toString());

    const request = createRequest(1n);
    await request['setDcaQuoteParams']();
    expect(request['dcaQuoteParams']).toEqual(null);
  });

  it('uses the buy chunk size if it exists', async () => {
    env.DCA_BUY_CHUNK_SIZE_USD = { Flip: 200 };
    env.DCA_SELL_CHUNK_SIZE_USD = { Flip: 300 };
    vi.mocked(getUsdValue).mockResolvedValue('6000');
    const request = createRequest(15000n);
    await request['setDcaQuoteParams']();
    expect(request['dcaQuoteParams']).toMatchInlineSnapshot(`
      {
        "additionalSwapDurationSeconds": 348,
        "chunkIntervalBlocks": 2,
        "chunkSize": 500n,
        "numberOfChunks": 30,
      }
    `);
  });
});

describe(QuoteRequest.prototype.toLogInfo, () => {
  it('formats the log info properly', () => {
    vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValueOnce(0.15);

    const req = createRequest(1_000_000n);

    expect(req.toLogInfo()).toMatchInlineSnapshot(`
      {
        "brokerCommissionBps": 0,
        "dcaQuote": null,
        "dcaQuoteParams": null,
        "destAsset": "Flip",
        "destAssetIndexPrice": null,
        "duration": "0.15",
        "estimatedBoostFeeBps": undefined,
        "inputAmount": "0.01",
        "limitOrders": [],
        "maxBoostFeeBps": undefined,
        "regularQuote": null,
        "srcAsset": "Btc",
        "srcAssetIndexPrice": null,
        "success": false,
      }
    `);
  });
});
