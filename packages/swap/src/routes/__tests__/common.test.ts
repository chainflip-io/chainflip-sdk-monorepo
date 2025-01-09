import * as express from 'express';
import { describe, it, expect } from 'vitest';
import { handleQuotingError } from '../common';

describe(handleQuotingError, () => {
  it('handles internal error message', () => {
    expect(() =>
      handleQuotingError(
        {} as unknown as express.Response,
        new Error('RPC error [-32603]: Internal error while processing request.', {}),
        { srcAsset: 'Eth', destAsset: 'Flip', amount: '1', limitOrdersReceived: [], usdValue: '1' },
      ),
    ).toThrow('insufficient liquidity for requested amount');
  });
});
