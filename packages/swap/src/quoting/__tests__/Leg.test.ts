import Leg from '../Leg';

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

  describe(Leg.prototype.toPoolJSON, () => {
    it('returns the leg formatted for the RPC', () => {
      const leg = Leg.of('Usdc', 'Dot', 100n);

      expect(leg.toPoolJSON()).toEqual({
        amount: 100n,
        srcAsset: 'Usdc',
        destAsset: 'Dot',
      });
    });
  });

  describe(Leg.prototype.toMarketMakerJSON, () => {
    it('returns the leg formatted for the market maker (BUY)', () => {
      const leg = Leg.of('Usdc', 'Dot', 100n);

      expect(leg.toMarketMakerJSON()).toEqual({
        base_asset: { asset: 'DOT', chain: 'Polkadot' },
        quote_asset: { asset: 'USDC', chain: 'Ethereum' },
        amount: '100',
        side: 'BUY',
      });
    });

    it('returns the leg formatted for the market maker (SELL)', () => {
      const leg = Leg.of('Dot', 'Usdc', 100n);

      expect(leg.toMarketMakerJSON()).toEqual({
        base_asset: { asset: 'DOT', chain: 'Polkadot' },
        quote_asset: { asset: 'USDC', chain: 'Ethereum' },
        amount: '100',
        side: 'SELL',
      });
    });
  });
});
