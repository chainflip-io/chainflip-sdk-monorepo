import { SupportedAsset, supportedAsset } from '@/shared/enums';

export const isSupportedAsset = (value: string): value is SupportedAsset =>
  supportedAsset.safeParse(value).success;

export function assertSupportedAsset(
  value: string,
): asserts value is SupportedAsset {
  if (!isSupportedAsset(value)) {
    throw new Error(`received invalid asset "${value}"`);
  }
}

export const decimalPlaces: Record<SupportedAsset, number> = {
  DOT: 10,
  ETH: 18,
  FLIP: 18,
  USDC: 6,
  BTC: 8,
};
