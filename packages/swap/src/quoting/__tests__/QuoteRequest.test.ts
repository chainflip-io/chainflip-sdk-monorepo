/* eslint-disable dot-notation */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import env from '../../config/env.js';
import { getUsdValue } from '../../pricing/checkPriceWarning.js';
import { calculateRecommendedSlippage } from '../../utils/autoSlippage.js';
import { isAtLeastSpecVersion } from '../../utils/function.js';
import { getMinimumEgressAmount } from '../../utils/rpc.js';
import { getSwapRateV3 } from '../../utils/statechain.js';
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

  describe(QuoteRequest.prototype['getPoolQuote'], () => {
    it('should not modify returned network fee for internal swaps in release version >= 1.10.0', async () => {
      vi.mocked(isAtLeastSpecVersion).mockResolvedValueOnce(true);

      const mockedNetworkFeeAmount = 123456;

      const mockedNetworkFee = {
        amount: BigInt(mockedNetworkFeeAmount),
        asset: 'USDC' as const,
        chain: 'Ethereum' as const,
      };

      vi.mocked(getSwapRateV3).mockResolvedValue({
        egressFee: { amount: 0n, asset: 'USDC', chain: 'Ethereum' },
        ingressFee: { amount: 0n, asset: 'FLIP', chain: 'Ethereum' },
        networkFee: mockedNetworkFee,
        egressAmount: 100n,
        intermediateAmount: 100n,
        brokerFee: { amount: 0n, asset: 'USDC', chain: 'Ethereum' },
      });

      vi.mocked(getMinimumEgressAmount).mockResolvedValue(100n);

      vi.mocked(estimateSwapDuration).mockResolvedValue({
        durations: {
          swap: 12345,
        },
        total: 12345,
      });

      vi.mocked(calculateRecommendedSlippage).mockResolvedValue(0.5);

      // check if getPoolQuote does not modify network fee when v1.10 and isOnChain = true
      const req = createRequest(27180n);
      (req as any).isOnChain = true;
      (req as any).pools = [{ baseAsset: 'Btc' }, { baseAsset: 'Flip' }];

      const mockQuoter = {
        getLimitOrders: vi.fn().mockResolvedValue([{ id: 'mock-order' }]),
      };

      (req as any).quoter = mockQuoter;
      await req['setLimitOrders']();

      const result = await req['getPoolQuote']();

      const networkFee = result.includedFees.find((fee) => fee.type === 'NETWORK');
      expect(networkFee?.amount).toBe(mockedNetworkFeeAmount.toString());
    });
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
        "limitOrders": [],
        "maxBoostFeeBps": undefined,
        "regularQuote": null,
        "srcAsset": "Btc",
        "srcAssetIndexPrice": 105123.1234,
        "success": false,
      }
    `);
  });
});
