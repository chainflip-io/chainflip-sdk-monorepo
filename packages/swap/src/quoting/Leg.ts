import assert from 'assert';
import { Side, type SwapInput } from '@/amm-addon';
import { InternalAsset, getAssetAndChain } from '@/shared/enums';
import { Leg as MarketMakerLeg } from './schemas';
import { assertUnreachable } from '../utils/function';
import { SwapRateArgs } from '../utils/statechain';

type BaseAsset = Exclude<InternalAsset, 'Usdc'>;

export default class Leg {
  static of(baseAsset: InternalAsset, quoteAsset: InternalAsset, amount: bigint): Leg;
  static of(baseAsset: InternalAsset, quoteAsset: InternalAsset, amount: bigint | null): Leg | null;
  static of(baseAsset: InternalAsset, quoteAsset: InternalAsset, amount: bigint | null) {
    if (amount === null) return null;
    assert(baseAsset !== quoteAsset, 'baseAsset and quoteAsset must be different');
    assert(baseAsset === 'Usdc' || quoteAsset === 'Usdc', 'one of the assets must be USDC');
    return new Leg(baseAsset, quoteAsset, amount);
  }

  private constructor(
    private readonly baseAsset: InternalAsset,
    private readonly quoteAsset: InternalAsset,
    public amount: bigint,
  ) {}

  toPoolJSON(): SwapRateArgs {
    return {
      amount: this.amount,
      srcAsset: this.baseAsset,
      destAsset: this.quoteAsset,
    };
  }

  private getSide(): 'BUY' | 'SELL' {
    return this.quoteAsset !== 'Usdc' ? 'BUY' : 'SELL';
  }

  toMarketMakerJSON(): MarketMakerLeg {
    const side = this.getSide();
    let normalizedBaseAsset: BaseAsset;
    const normalizedQuoteAsset = 'Usdc';

    if (this.quoteAsset !== 'Usdc') {
      normalizedBaseAsset = this.quoteAsset;
    } else if (this.baseAsset !== 'Usdc') {
      normalizedBaseAsset = this.baseAsset;
    } else {
      return assertUnreachable('invalid leg');
    }

    return {
      base_asset: getAssetAndChain(normalizedBaseAsset),
      quote_asset: getAssetAndChain(normalizedQuoteAsset),
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
