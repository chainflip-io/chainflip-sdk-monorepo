import { QuoteQueryResponse } from '@/shared/schemas';
import { estimateSwapDuration } from '@/swap/utils/swap';
import { buildFee } from './fees';
import { getMinimumEgressAmount } from './rpc';
import ServiceError from './ServiceError';
import { LimitOrders, getSwapRate } from './statechain';
import { InternalAsset } from '../client';
import { getInternalAsset } from '../enums';
import { checkPriceWarning } from '../pricing/checkPriceWarning';

export default async function getPoolQuote(
  srcAsset: InternalAsset,
  destAsset: InternalAsset,
  swapInputAmount: bigint,
  limitOrders?: LimitOrders,
  boosted?: boolean,
): Promise<QuoteQueryResponse> {
  const { egressFee, ingressFee, networkFee, ...quote } = await getSwapRate({
    srcAsset,
    destAsset,
    amount: swapInputAmount,
    limitOrders,
  });

  const lowLiquidityWarning = await checkPriceWarning({
    srcAsset,
    destAsset,
    srcAmount: swapInputAmount,
    destAmount: BigInt(quote.outputAmount),
  });

  const includedFees = [
    buildFee(getInternalAsset(ingressFee), 'INGRESS', ingressFee.amount),
    buildFee('Usdc', 'NETWORK', networkFee.amount),
    buildFee(getInternalAsset(egressFee), 'EGRESS', ingressFee.amount),
  ];

  const minimumEgressAmount = await getMinimumEgressAmount(destAsset);

  if (quote.outputAmount < minimumEgressAmount) {
    throw ServiceError.badRequest(
      `egress amount (${quote.outputAmount}) is lower than minimum egress amount (${minimumEgressAmount})`,
    );
  }

  const { outputAmount, ...response } = {
    ...quote,
    intermediateAmount: quote.intermediateAmount?.toString(),
    egressAmount: quote.outputAmount.toString(),
    includedFees,
    lowLiquidityWarning,
    estimatedDurationSeconds: await estimateSwapDuration({ srcAsset, destAsset, boosted }),
  };

  return response;
}
