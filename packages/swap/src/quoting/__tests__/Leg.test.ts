import { describe, it, expect } from 'vitest';
import Leg from '../Leg.js';

describe(Leg, () => {
  describe(Leg.of, () => {
    it('returns null if amount is null', () => {
      expect(Leg.of('Usdc', 'Usdt', null)).toBeNull();
    });

    it('throws if baseAsset and quoteAsset are the same', () => {
      expect(() => Leg.of('Usdc', 'Usdc', 100n)).toThrow();
    });

    it('throws if neither baseAsset nor quoteAsset is Usdc', () => {
      expect(() => Leg.of('Dot', 'Usdt', 100n)).toThrow();
    });

    it('returns a Leg instance', () => {
      const leg = Leg.of('Usdc', 'Dot', 100n);
      expect(leg).toBeInstanceOf(Leg);
      expect(leg.amount).toBe(100n);
    });
  });

  describe(Leg.prototype.toJSON, () => {
    it('returns the leg formatted for the market maker (BUY)', () => {
      const leg = Leg.of('Usdc', 'Dot', 100n);

      expect(leg.toJSON()).toEqual({
        base_asset: { asset: 'DOT', chain: 'Polkadot' },
        quote_asset: { asset: 'USDC', chain: 'Ethereum' },
        amount: '100',
        side: 'BUY',
      });
    });

    it('returns the leg formatted for the market maker (SELL)', () => {
      const leg = Leg.of('Dot', 'Usdc', 100n);

      expect(leg.toJSON()).toEqual({
        base_asset: { asset: 'DOT', chain: 'Polkadot' },
        quote_asset: { asset: 'USDC', chain: 'Ethereum' },
        amount: '100',
        side: 'SELL',
      });
    });
  });
});
