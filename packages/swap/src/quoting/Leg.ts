import assert from 'assert';
import { Side, type SwapInput } from '@/amm-addon';
import { InternalAsset, getAssetAndChain } from '@/shared/enums';
import { Leg as MarketMakerLeg } from './schemas';
import { SwapRateArgs } from '../utils/statechain';

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

  toPoolJSON(): SwapRateArgs {
    return {
      amount: this.amount,
      srcAsset: this.srcAsset,
      destAsset: this.destAsset,
    };
  }

  private getSide(): 'BUY' | 'SELL' {
    return this.destAsset !== 'Usdc' ? 'BUY' : 'SELL';
  }

  toMarketMakerJSON(): MarketMakerLeg {
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

  toSwapInput(): SwapInput {
    return {
      side: this.getSide() === 'BUY' ? Side.Buy : Side.Sell,
      amount: this.amount,
      limitOrders: [],
    };
  }
}
