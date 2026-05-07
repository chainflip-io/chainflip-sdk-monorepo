import { type UUID } from 'crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import env from '../../config/env.js';
import { logStorage } from '../../utils/logger.js';
import { queues } from '../initialize.js';
import {
  publishQuoteOrderError,
  publishQuoteOrderReceived,
  publishQuoteOrderTimeout,
  publishQuoteRequestFailed,
  publishQuoteRequestReceived,
  publishQuoteResponseSent,
} from '../quoteEvents.js';

const ONE_DAY_IN_SECONDS = 3600 * 24;

vi.mock('../initialize.js', () => ({
  queues: { quoteEvents: undefined },
}));

const mockAdd = vi.fn().mockResolvedValue(undefined);

const mockRequestId = '550e8400-e29b-41d4-a716-446655440000' as UUID;

describe('quoteEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(logStorage, 'getStore').mockReturnValue(mockRequestId);
    env.MESSAGE_QUEUE_DELAY_MS = 0;
  });

  describe('when queue is disabled', () => {
    it('publishQuoteRequestReceived is a no-op', () => {
      publishQuoteRequestReceived({ srcAsset: 'Btc', destAsset: 'Eth' });
      expect(mockAdd).not.toHaveBeenCalled();
    });

    it('publishQuoteResponseSent is a no-op', () => {
      publishQuoteResponseSent({ srcAsset: 'Btc', success: true });
      expect(mockAdd).not.toHaveBeenCalled();
    });

    it('publishQuoteRequestFailed is a no-op', () => {
      publishQuoteRequestFailed({ srcAsset: 'Btc' }, new Error('test'));
      expect(mockAdd).not.toHaveBeenCalled();
    });

    it('publishQuoteOrderReceived is a no-op', () => {
      publishQuoteOrderReceived({ marketMaker: 'mm1' });
      expect(mockAdd).not.toHaveBeenCalled();
    });

    it('publishQuoteOrderTimeout is a no-op', () => {
      publishQuoteOrderTimeout({ marketMaker: 'mm1' });
      expect(mockAdd).not.toHaveBeenCalled();
    });

    it('publishQuoteOrderError is a no-op', () => {
      publishQuoteOrderError({ marketMaker: 'mm1', error: 'bad' });
      expect(mockAdd).not.toHaveBeenCalled();
    });
  });

  describe('when queue is enabled', () => {
    beforeEach(() => {
      (queues as { quoteEvents: unknown }).quoteEvents = { add: mockAdd };
    });

    it('publishes quote.request.received with correct data', () => {
      const data = {
        srcAsset: 'Btc',
        destAsset: 'Eth',
        depositAmount: '100000000',
        dcaEnabled: false,
      };

      publishQuoteRequestReceived(data);

      expect(mockAdd).toHaveBeenCalledWith(
        'quote.request.received',
        expect.objectContaining({
          srcAsset: 'Btc',
          destAsset: 'Eth',
          depositAmount: '100000000',
          dcaEnabled: false,
          quoteRequestId: mockRequestId,
          event: 'quote.request.received',
          timestamp: expect.any(String),
        }),
        { delay: 0, removeOnComplete: { count: 1000 }, removeOnFail: { count: 5000 } },
      );
    });

    it('publishes quote.response.sent with correct data', () => {
      const data = {
        srcAsset: 'Btc',
        destAsset: 'Eth',
        success: true,
        regularQuote: { egressAmount: '5000000000000000000' },
      };

      publishQuoteResponseSent(data);

      expect(mockAdd).toHaveBeenCalledWith(
        'quote.response.sent',
        expect.objectContaining({
          srcAsset: 'Btc',
          destAsset: 'Eth',
          success: true,
          quoteRequestId: mockRequestId,
          event: 'quote.response.sent',
          timestamp: expect.any(String),
        }),
        { delay: 0, removeOnComplete: { count: 1000 }, removeOnFail: { count: 5000 } },
      );
    });

    it('publishes quote.request.failed with error message', () => {
      const data = { srcAsset: 'Btc', destAsset: 'Eth' };
      const error = new Error('insufficient liquidity');

      publishQuoteRequestFailed(data, error);

      expect(mockAdd).toHaveBeenCalledWith(
        'quote.request.failed',
        expect.objectContaining({
          srcAsset: 'Btc',
          destAsset: 'Eth',
          quoteRequestId: mockRequestId,
          event: 'quote.request.failed',
          error: 'insufficient liquidity',
          timestamp: expect.any(String),
        }),
        { delay: 0, removeOnComplete: { count: 1000 }, removeOnFail: { count: 5000 } },
      );
    });

    it('publishes quote.request.failed with non-Error values', () => {
      publishQuoteRequestFailed({ srcAsset: 'Btc' }, 'string error');

      expect(mockAdd).toHaveBeenCalledWith(
        'quote.request.failed',
        expect.objectContaining({
          error: 'string error',
        }),
        { delay: 0, removeOnComplete: { count: 1000 }, removeOnFail: { count: 5000 } },
      );
    });

    it('serializes bigint values to strings', () => {
      const data = {
        depositAmount: 100000000n,
        nested: { chunkSize: 50000n },
        items: [{ amount: 200n }],
      };

      publishQuoteRequestReceived(data as unknown as Record<string, unknown>);

      const publishedData = mockAdd.mock.calls[0][1];
      expect(publishedData.depositAmount).toBe('100000000');
      expect(publishedData.nested.chunkSize).toBe('50000');
      expect(publishedData.items[0].amount).toBe('200');
    });

    it('uses MESSAGE_QUEUE_DELAY_MS for the delay option', () => {
      env.MESSAGE_QUEUE_DELAY_MS = 5000;

      publishQuoteRequestReceived({ srcAsset: 'Btc' });

      expect(mockAdd).toHaveBeenCalledWith('quote.request.received', expect.any(Object), {
        delay: 5000,
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      });
    });

    it('catches and logs errors from queue.add', async () => {
      const addError = new Error('redis connection lost');
      mockAdd.mockRejectedValueOnce(addError);

      publishQuoteRequestReceived({ srcAsset: 'Btc' });

      // allow the rejected promise to be caught
      await vi.waitFor(() => {
        expect(mockAdd).toHaveBeenCalled();
      });
    });

    it('handles null and undefined values in data', () => {
      const data = {
        srcAsset: 'Btc',
        ccmParams: null,
        brokerCommissionBps: undefined,
      };

      publishQuoteRequestReceived(data);

      const publishedData = mockAdd.mock.calls[0][1];
      expect(publishedData.ccmParams).toBeNull();
      expect(publishedData.brokerCommissionBps).toBeUndefined();
    });

    it('publishes quote.order.received with caller-supplied quoteRequestId and serialized legs', () => {
      publishQuoteOrderReceived({
        quoteRequestId: mockRequestId,
        marketMaker: 'mm1',
        marketMakerRequestId: 'req-123',
        legs: [[[10, 500n]]],
        beta: false,
      });

      expect(mockAdd).toHaveBeenCalledWith(
        'quote.order.received',
        expect.objectContaining({
          quoteRequestId: mockRequestId,
          marketMaker: 'mm1',
          marketMakerRequestId: 'req-123',
          legs: [[[10, '500']]],
          beta: false,
          event: 'quote.order.received',
          timestamp: expect.any(String),
        }),
        { delay: 0, removeOnComplete: { count: 1000 }, removeOnFail: { count: 5000 } },
      );
    });

    it('publishes quote.order.timeout with caller-supplied quoteRequestId', () => {
      publishQuoteOrderTimeout({
        quoteRequestId: mockRequestId,
        marketMaker: 'mm1',
        marketMakerRequestId: 'req-123',
      });

      expect(mockAdd).toHaveBeenCalledWith(
        'quote.order.timeout',
        expect.objectContaining({
          quoteRequestId: mockRequestId,
          marketMaker: 'mm1',
          marketMakerRequestId: 'req-123',
          event: 'quote.order.timeout',
          timestamp: expect.any(String),
        }),
        { delay: 0, removeOnComplete: { count: 1000 }, removeOnFail: { count: 5000 } },
      );
    });

    it('publishes quote.order.error with error and optional context', () => {
      publishQuoteOrderError({
        quoteRequestId: undefined,
        marketMaker: 'mm1',
        marketMakerRequestId: 'unknown',
        error: 'bad schema',
      });

      expect(mockAdd).toHaveBeenCalledWith(
        'quote.order.error',
        expect.objectContaining({
          marketMaker: 'mm1',
          marketMakerRequestId: 'unknown',
          error: 'bad schema',
          event: 'quote.order.error',
          timestamp: expect.any(String),
        }),
        { delay: 0, removeOnComplete: { count: 1000 }, removeOnFail: { count: 5000 } },
      );
      expect(mockAdd.mock.calls[0][1].quoteRequestId).toBeUndefined();
    });
  });
});
