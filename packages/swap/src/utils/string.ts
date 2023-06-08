import type { SupportedAsset } from '@/shared/enums';
import type { RpcAsset } from './RpcClient';

export const transformAsset = (asset: SupportedAsset): RpcAsset =>
  (asset[0] + asset.slice(1).toLowerCase()) as Capitalize<
    Lowercase<SupportedAsset>
  >;

export enum Comparison {
  Less = -1,
  Equal,
  Greater,
}

export const compareNumericStrings = (a: string, b: string): Comparison => {
  const bigintA = BigInt(a);
  const bigintB = BigInt(b);
  if (bigintA < bigintB) return Comparison.Less;
  if (bigintA > bigintB) return Comparison.Greater;
  return Comparison.Equal;
};
