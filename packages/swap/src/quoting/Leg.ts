import assert from 'assert';
import { InternalAsset, getAssetAndChain } from '@/shared/enums';
import { Leg as MarketMakerLeg } from './schemas';

export default class Leg {
  static of(srcAsset: InternalAsset, destAsset: InternalAsset, amount: bigint): Leg;
  static of(srcAsset: InternalAsset, destAsset: InternalAsset, amount: bigint | null): Leg | null;
  static of(srcAsset: InternalAsset, destAsset: InternalAsset, amount: bigint | null) {
    if (amount === null) return null;
    assert(srcAsset !== destAsset, 'srcAsset and destAsset must be different');
    assert(srcAsset === 'Usdc' || destAsset === 'Usdc', 'one of the assets must be Usdc');
    return new Leg(srcAsset, destAsset, amount);
  }

  private constructor(
    private readonly srcAsset: InternalAsset,
    private readonly destAsset: InternalAsset,
    public amount: bigint,
  ) {}

  private getSide(): 'BUY' | 'SELL' {
    return this.destAsset !== 'Usdc' ? 'BUY' : 'SELL';
  }

  getBaseAsset(): Exclude<InternalAsset, 'Usdc'> {
    if (this.destAsset !== 'Usdc') return this.destAsset;

    if (this.srcAsset !== 'Usdc') return this.srcAsset;

    throw new Error('one of the assets must be Usdc');
  }

  toJSON(): MarketMakerLeg {
    const side = this.getSide();
    let baseAsset: Exclude<InternalAsset, 'Usdc'>;

    if (this.destAsset !== 'Usdc') {
      baseAsset = this.destAsset;
    } else if (this.srcAsset !== 'Usdc') {
      baseAsset = this.srcAsset;
    }

    return {
      base_asset: getAssetAndChain(baseAsset!),
      quote_asset: getAssetAndChain('Usdc'),
      amount: this.amount.toString(),
      side,
    };
  }
}
