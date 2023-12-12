import assert from 'assert';
import { getPoolsNetworkFeeHundredthPips } from '@/shared/consts';
import { Assets, ChainflipNetwork } from '@/shared/enums';
import { QuoteFee, QuoteRequest } from '@/shared/schemas';
import { Pool } from '@/swap/client';
import { BrokerQuote, MarketMakerQuote } from '@/swap/quoting/schemas';

export const ONE_IN_HUNDREDTH_PIPS = 1000000;
export const getPips = (value: string, hundrethPips: number) =>
  (BigInt(value) * BigInt(hundrethPips)) / BigInt(ONE_IN_HUNDREDTH_PIPS);
export const calculateIncludedFees = (
  request: QuoteRequest,
  quote: MarketMakerQuote | BrokerQuote,
  pools: Pool[],
): QuoteFee[] => {
  const networkFeeHundredthPips = getPoolsNetworkFeeHundredthPips(
    process.env.CHAINFLIP_NETWORK as ChainflipNetwork,
  );

  if (request.source_asset === Assets.USDC) {
    return [
      {
        type: 'network',
        asset: Assets.USDC,
        amount: getPips(
          request.deposit_amount,
          networkFeeHundredthPips,
        ).toString(),
      },
      {
        type: 'liquidity',
        asset: request.source_asset,
        amount: getPips(
          request.deposit_amount,
          pools[0].liquidityFeeHundredthPips,
        ).toString(),
      },
    ];
  }

  if (request.destination_asset === Assets.USDC) {
    const stableAmountBeforeNetworkFee =
      (BigInt(quote.egressAmount) * BigInt(ONE_IN_HUNDREDTH_PIPS)) /
      BigInt(ONE_IN_HUNDREDTH_PIPS - networkFeeHundredthPips);

    return [
      {
        type: 'network',
        asset: Assets.USDC,
        amount: getPips(
          String(stableAmountBeforeNetworkFee),
          networkFeeHundredthPips,
        ).toString(),
      },
      {
        type: 'liquidity',
        asset: request.source_asset,
        amount: getPips(
          request.deposit_amount,
          pools[0].liquidityFeeHundredthPips,
        ).toString(),
      },
    ];
  }

  assert(
    'intermediateAmount' in quote && quote.intermediateAmount,
    'no intermediate amount on quote',
  );

  return [
    {
      type: 'network',
      asset: Assets.USDC,
      amount: getPips(
        quote.intermediateAmount,
        networkFeeHundredthPips,
      ).toString(),
    },
    {
      type: 'liquidity',
      asset: request.source_asset,
      amount: getPips(
        request.deposit_amount,
        pools[0].liquidityFeeHundredthPips,
      ).toString(),
    },
    {
      type: 'liquidity',
      asset: request.intermediate_asset,
      amount: getPips(
        quote.intermediateAmount,
        pools[1].liquidityFeeHundredthPips,
      ).toString(),
    },
  ];
};
