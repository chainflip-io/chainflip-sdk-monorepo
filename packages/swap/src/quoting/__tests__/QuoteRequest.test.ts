/* eslint-disable dot-notation */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import env from '../../config/env.js';
import { checkPriceWarning, getUsdValue } from '../../pricing/checkPriceWarning.js';
import { calculateRecommendedSlippage } from '../../utils/autoSlippage.js';
import { getMinimumEgressAmount } from '../../utils/rpc.js';
import { getSwapRateV3, SwapRateResult } from '../../utils/statechain.js';
import { estimateSwapDuration } from '../../utils/swap.js';
import QuoteRequest, { MAX_NUMBER_OF_CHUNKS } from '../QuoteRequest.js';

const originalEnv = structuredClone(env);

vi.mock('../../utils/function', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    isAtLeastSpecVersion: vi.fn().mockResolvedValue(true),
  };
});

vi.mock('../../utils/statechain');

vi.mock('../../utils/swap', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    estimateSwapDuration: vi.fn(),
  };
});

vi.mock('../../utils/autoSlippage');

vi.mock('../../utils/rpc');

vi.mock('../../polkadot/api');

vi.mock('../../pricing/checkPriceWarning', () => ({
  checkPriceWarning: vi.fn(),
  getUsdValue: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../utils/fees', () => ({
  getPoolFees: vi.fn().mockReturnValue([]),
}));

const createRequest = (amount: bigint) =>
  new QuoteRequest({ getLimitOrders: vi.fn() } as any, {
    srcAsset: 'Btc',
    destAsset: 'Flip',
    amount,
    brokerCommissionBps: 0,
    ccmParams: undefined,
    dcaEnabled: true,
    dcaV2Enabled: false,
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
    expect(vi.mocked(request['quoter'].getLimitOrders).mock.calls).toMatchInlineSnapshot(`
      [
        [
          "Btc",
          "Flip",
          6795n,
        ],
      ]
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
    expect(vi.mocked(request['quoter'].getLimitOrders).mock.calls).toMatchInlineSnapshot(`
      [
        [
          "Btc",
          "Flip",
          6975n,
        ],
      ]
    `);
  });

  it('should correctly handle 300 usd worth of btc', async () => {
    vi.mocked(getUsdValue).mockResolvedValue('300');

    const request = createRequest(900n);
    await request['setDcaQuoteParams']();
    expect(request['dcaQuoteParams']).toEqual(null);
    expect(vi.mocked(request['quoter'].getLimitOrders).mock.calls).toMatchInlineSnapshot(`[]`);
  });

  it('should correctly handle 30 usd worth of btc', async () => {
    vi.mocked(getUsdValue).mockResolvedValue('30');

    const request = createRequest(90n);
    await request['setDcaQuoteParams']();
    expect(request['dcaQuoteParams']).toEqual(null);
    expect(vi.mocked(request['quoter'].getLimitOrders).mock.calls).toMatchInlineSnapshot(`[]`);
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
    expect(vi.mocked(request['quoter'].getLimitOrders).mock.calls).toMatchInlineSnapshot(`[]`);
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
    expect(vi.mocked(request['quoter'].getLimitOrders).mock.calls).toMatchInlineSnapshot(`
      [
        [
          "Btc",
          "Flip",
          500n,
        ],
      ]
    `);
  });
});

describe(QuoteRequest.prototype['getPoolQuote'], () => {
  // BTC (8 decimals) → FLIP (18 decimals), 2-leg swap via USDC
  // depositAmount = 10_000 satoshis (0.0001 BTC)
  // srcIndexPrice = $100_000/BTC, destIndexPrice = $5/FLIP
  // swapInputAmount = 10_000 (0 ingress fee)
  // srcAmountInTokens = 0.0001 BTC
  // expectedOutputInTokens = 0.0001 * 100_000 / 5 = 2 FLIP
  //
  // with recommendedSlippage = 1.5%:
  //   minimumOutput = 2 * 0.985 = 1.97 FLIP = 1_970_000_000_000_000_000n

  const defaultSwapRateResult = {
    ingressFee: { amount: 0n, asset: 'BTC', chain: 'Bitcoin' },
    networkFee: { amount: 0n, asset: 'USDC', chain: 'Ethereum' },
    brokerFee: { amount: 0n, asset: 'BTC', chain: 'Bitcoin' },
    egressFee: { amount: 0n, asset: 'FLIP', chain: 'Ethereum' },
    intermediateAmount: 10_000_000n, // 10 USDC intermediate
    egressAmount: 2_000_000_000_000_000_000n, // 2 FLIP nominal
  } as unknown as SwapRateResult;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSwapRateV3).mockResolvedValue(defaultSwapRateResult);
    vi.mocked(calculateRecommendedSlippage).mockResolvedValue(1.5);
    vi.mocked(estimateSwapDuration).mockResolvedValue({
      total: 702,
      durations: { swap: 12, deposit: 600, egress: 90 },
    });
    vi.mocked(checkPriceWarning).mockResolvedValue(undefined);
    vi.mocked(getMinimumEgressAmount).mockResolvedValue(0n);
  });

  it('passes when egress amount is above the minimum threshold', async () => {
    const request = createRequest(10_000n);
    request['regularLimitOrders'] = [];
    request['srcAssetIndexPrice'] = 100_000;
    request['destAssetIndexPrice'] = 5;
    vi.mocked(getSwapRateV3).mockResolvedValue({
      ...defaultSwapRateResult,
      egressAmount: 1_970_000_000_000_000_001n, // just above 1.97 FLIP minimum
    });

    await expect(request['getPoolQuote']()).resolves.toMatchObject({
      egressAmount: '1970000000000000001',
    });
  });

  it('throws when egress amount is below the minimum threshold', async () => {
    const request = createRequest(10_000n);
    request['regularLimitOrders'] = [];
    request['srcAssetIndexPrice'] = 100_000;
    request['destAssetIndexPrice'] = 5;
    vi.mocked(getSwapRateV3).mockResolvedValue({
      ...defaultSwapRateResult,
      egressAmount: 1_969_999_999_999_999_999n, // just below 1.97 FLIP minimum
    });

    await expect(request['getPoolQuote']()).rejects.toThrow(
      'insufficient liquidity for the requested amount',
    );
  });

  it('skips the check when no index prices are available', async () => {
    const request = createRequest(10_000n);
    request['regularLimitOrders'] = [];
    vi.mocked(getSwapRateV3).mockResolvedValue({
      ...defaultSwapRateResult,
      egressAmount: 1n, // would fail if check ran
    });

    await expect(request['getPoolQuote']()).resolves.toMatchObject({ egressAmount: '1' });
  });

  it('skips the check when only one index price is available', async () => {
    const request = createRequest(10_000n);
    request['regularLimitOrders'] = [];
    request['srcAssetIndexPrice'] = 100_000;
    // destAssetIndexPrice not set
    vi.mocked(getSwapRateV3).mockResolvedValue({
      ...defaultSwapRateResult,
      egressAmount: 1n, // would fail if check ran
    });

    await expect(request['getPoolQuote']()).resolves.toMatchObject({ egressAmount: '1' });
  });
});

describe(QuoteRequest.prototype.toLogInfo, () => {
  it('formats the log info properly', () => {
    vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValueOnce(0.15);

    const req = createRequest(1_000_000n);
    req['srcAssetIndexPrice'] = 105123.1234;
    req['destAssetIndexPrice'] = 0.3412341234;

    expect(req.toLogInfo()).toMatchInlineSnapshot(`
      {
        "brokerCommissionBps": 0,
        "dcaLimitOrders": null,
        "dcaQuote": null,
        "dcaQuoteParams": null,
        "destAsset": "Flip",
        "destAssetIndexPrice": 0.3412341234,
        "duration": "0.15",
        "error": null,
        "estimatedBoostFeeBps": undefined,
        "inputAmount": "0.01",
        "inputValueUsd": "1051.23",
        "isInternalSwap": false,
        "isVaultSwap": false,
        "maxBoostFeeBps": undefined,
        "regularLimitOrders": null,
        "regularQuote": null,
        "srcAsset": "Btc",
        "srcAssetIndexPrice": 105123.1234,
        "success": false,
      }
    `);
  });
});
