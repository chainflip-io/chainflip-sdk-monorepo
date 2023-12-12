import { z } from 'zod';
import { Asset } from './enums';
import {
  chainflipAsset,
  chainflipAssetAndChain,
  chainflipChain,
  hexStringWithMaxByteSize,
  numericString,
} from './parsers';

export const quoteQuerySchema = z.object({
  srcAsset: chainflipAssetAndChain,
  destAsset: chainflipAssetAndChain,
  amount: numericString,
});

export type QuoteQueryParams = z.input<typeof quoteQuerySchema>;
export type ParsedQuoteParams = z.output<typeof quoteQuerySchema>;

export const ccmMetadataSchema = z.object({
  gasBudget: numericString,
  message: hexStringWithMaxByteSize(1024 * 10),
});

export type CcmMetadata = z.infer<typeof ccmMetadataSchema>;

export const openSwapDepositChannelSchema = z
  .object({
    srcAsset: chainflipAsset,
    destAsset: chainflipAsset,
    srcChain: chainflipChain,
    destChain: chainflipChain,
    destAddress: z.string(),
    amount: numericString,
    ccmMetadata: ccmMetadataSchema.optional(),
  })
  .transform(({ amount, ...rest }) => ({
    ...rest,
    expectedDepositAmount: amount,
  }));

export type OpenSwapDepositChannelArgs = z.input<
  typeof openSwapDepositChannelSchema
>;

export type PostSwapResponse = {
  id: string;
  depositAddress: string;
  issuedBlock: number;
};

export type SwapFee = {
  type: 'liquidity' | 'network';
  asset: Asset;
  amount: string;
};

export type QuoteQueryResponse = {
  intermediateAmount?: string;
  egressAmount: string;
  includedFees: SwapFee[];
};

interface BaseRequest {
  id: string; // random UUID
  deposit_amount: string; // base unit of the deposit asset, e.g. wei for ETH
}

interface Intermediate extends BaseRequest {
  source_asset: Exclude<Asset, 'USDC'>;
  intermediate_asset: 'USDC';
  destination_asset: Exclude<Asset, 'USDC'>;
}

interface USDCDeposit extends BaseRequest {
  source_asset: 'USDC';
  intermediate_asset: null;
  destination_asset: Exclude<Asset, 'USDC'>;
}

interface USDCEgress extends BaseRequest {
  source_asset: Exclude<Asset, 'USDC'>;
  intermediate_asset: null;
  destination_asset: 'USDC';
}

export type QuoteRequest = Intermediate | USDCDeposit | USDCEgress;
