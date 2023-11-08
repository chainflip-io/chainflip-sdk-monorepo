import { z } from 'zod';
import { Asset } from './enums';
import {
  chainflipAsset,
  chainflipChain,
  hexString,
  number,
  numericString,
  string,
} from './parsers';
import { channelIdRegex } from './strings';

export const quoteQuerySchema = z.object({
  srcAsset: chainflipAsset,
  destAsset: chainflipAsset,
  amount: numericString,
});

export type QuoteQueryParams = z.infer<typeof quoteQuerySchema>;

export const ccmMetadataSchema = z.object({
  gasBudget: numericString,
  message: hexString,
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

export const depositChannelIdRegex = z.string().regex(channelIdRegex);
export const swapIdRegex = z.string().regex(/^\d+$/i);
export const txHashRegex = z.string().regex(/^0x[a-f\d]+$/i);

const swapStatusId = z.union([depositChannelIdRegex, swapIdRegex, txHashRegex]);

export const getSwapStatusSchema = z.object({
  id: swapStatusId,
});

export const swapState = z.enum([
  'AWAITING_DEPOSIT',
  'DEPOSIT_RECEIVED',
  'SWAP_EXECUTED',
  'EGRESS_SCHEDULED',
  'BROADCAST_REQUESTED',
  'BROADCAST_ABORTED',
  'COMPLETE',
]);

const baseSwapResponseSchema = z.object({
  srcChain: chainflipChain,
  destChain: chainflipChain,
  srcAsset: chainflipAsset,
  destAsset: chainflipAsset,
  destAddress: string.optional(),
  depositAddress: string.optional(),
  depositChannelCreatedAt: number.optional(),
  expectedDepositAmount: string.optional(),
  depositChannelExpiryBlock: z.bigint().optional().nullable(),
  estimatedDepositChannelExpiryTime: number.optional(),
  isDepositChannelExpired: z.boolean(),
  ccmDepositReceivedBlockIndex: string.optional().nullable(),
  ccmMetadata: z
    .object({
      gasBudget: string,
      message: string.nullable(),
    })
    .optional()
    .nullable(),
});

const awaitingState = baseSwapResponseSchema.extend({
  state: swapState.refine((state) => state === swapState.Enum.AWAITING_DEPOSIT),
  depositAmount: string.optional(),
  depositTransactionHash: string.optional(),
  depositTransactionConfirmations: number.optional(),
});
const depositReceivedState = awaitingState.extend({
  state: swapState.refine((state) => state === swapState.Enum.DEPOSIT_RECEIVED),
  swapId: string,
  depositAmount: string,
  depositReceivedAt: number,
  depositReceivedBlockIndex: string,
});
const swapExecutedState = depositReceivedState.extend({
  state: swapState.refine((state) => state === swapState.Enum.SWAP_EXECUTED),
  intermediateAmount: string.optional(),
  swapExecutedAt: number,
  swapExecutedBlockIndex: string,
});
const egressScheduledState = swapExecutedState.extend({
  state: swapState.refine((state) => state === swapState.Enum.EGRESS_SCHEDULED),
  egressAmount: string,
  egressScheduledAt: number,
  egressScheduledBlockIndex: string,
});
const broadcastRequestedState = egressScheduledState.extend({
  state: swapState.refine(
    (state) => state === swapState.Enum.BROADCAST_REQUESTED,
  ),
  broadcastRequestedAt: number,
  broadcastRequestedBlockIndex: string,
});
const broadcastAbortedState = broadcastRequestedState.extend({
  state: swapState.refine(
    (state) => state === swapState.Enum.BROADCAST_ABORTED,
  ),
  broadcastAbortedAt: number,
  broadcastAbortedBlockIndex: string,
});
const broadcastSucceededState = broadcastRequestedState.extend({
  state: swapState.refine((state) => state === swapState.Enum.COMPLETE),
  swapExecutedBlockIndex: string,
  broadcastSucceededAt: number,
  broadcastSucceededBlockIndex: string,
});

export const swapResponseSchema = z.union([
  awaitingState,
  depositReceivedState,
  swapExecutedState,
  egressScheduledState,
  broadcastRequestedState,
  broadcastAbortedState,
  broadcastSucceededState,
]);

export type OpenSwapDepositChannelArgs = z.input<
  typeof openSwapDepositChannelSchema
>;

export type PostSwapResponse = {
  id: string;
  depositAddress: string;
  issuedBlock: number;
};

export type QuoteFee = {
  type: 'liquidity' | 'network';
  asset: Asset;
  amount: string;
};

export type QuoteQueryResponse = {
  intermediateAmount?: string;
  egressAmount: string;
  includedFees: QuoteFee[];
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
