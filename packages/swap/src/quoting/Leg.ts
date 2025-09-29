import {
  BaseAssetAndChain,
  BaseChainflipAsset,
  ChainflipAsset,
  internalAssetToRpcAsset,
} from '@chainflip/utils/chainflip';
import assert from 'assert';
import { LegJson } from './schemas.js';

export default class Leg {
  static of(srcAsset: ChainflipAsset, destAsset: ChainflipAsset, amount: bigint): Leg;
  static of(srcAsset: ChainflipAsset, destAsset: ChainflipAsset, amount: bigint | null): Leg | null;
  static of(srcAsset: ChainflipAsset, destAsset: ChainflipAsset, amount: bigint | null) {
    if (amount === null) return null;
    assert(srcAsset !== 'Dot' && destAsset !== 'Dot', 'Dot is not supported anymore');
    assert(srcAsset !== destAsset, 'srcAsset and destAsset must be different');
    assert(srcAsset === 'Usdc' || destAsset === 'Usdc', 'one of the assets must be Usdc');
    return new Leg(srcAsset, destAsset, amount);
  }

  private constructor(
    private readonly srcAsset: Exclude<ChainflipAsset, 'Dot'>,
    private readonly destAsset: Exclude<ChainflipAsset, 'Dot'>,
    public amount: bigint,
  ) {}

  private getSide(): 'BUY' | 'SELL' {
    return this.destAsset !== 'Usdc' ? 'BUY' : 'SELL';
  }

  getBaseAsset(): Exclude<BaseChainflipAsset, 'Dot'> {
    if (this.destAsset !== 'Usdc') return this.destAsset;

    if (this.srcAsset !== 'Usdc') return this.srcAsset;

    throw new Error('one of the assets must be Usdc');
  }

  toJSON(): LegJson {
    const side = this.getSide();
    let baseAsset: Exclude<BaseChainflipAsset, 'Dot'>;

    if (this.destAsset !== 'Usdc') {
      baseAsset = this.destAsset;
    } else if (this.srcAsset !== 'Usdc') {
      baseAsset = this.srcAsset;
    }

    return {
      base_asset: internalAssetToRpcAsset[baseAsset!] as BaseAssetAndChain,
      quote_asset: internalAssetToRpcAsset.Usdc as LegJson['quote_asset'],
      amount: this.amount.toString(),
      side,
    };
  }
}
