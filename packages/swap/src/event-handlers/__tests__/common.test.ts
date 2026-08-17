import { describe, expect, it } from 'vitest';
import { getDepositTxRef } from '../common.js';

describe(getDepositTxRef, () => {
  it('builds an assethub ref from the spec 230 deposit details', () => {
    expect(
      getDepositTxRef({
        chain: 'Assethub',
        data: { blockNumber: 9876543, extrinsicIndex: 2 },
      }),
    ).toBe('9876543-2');
  });

  it('prefers the spec 230 deposit details over the event block height', () => {
    expect(
      getDepositTxRef(
        { chain: 'Assethub', data: { blockNumber: 9876543, extrinsicIndex: 2 } },
        111n,
      ),
    ).toBe('9876543-2');
  });

  it('builds an assethub ref from a legacy extrinsic index and the event block height', () => {
    expect(getDepositTxRef({ chain: 'Assethub', data: 2 }, 9876543n)).toBe('9876543-2');
  });

  it('cannot build a legacy assethub ref without the event block height', () => {
    expect(getDepositTxRef({ chain: 'Assethub', data: 2 })).toBeUndefined();
  });
});
