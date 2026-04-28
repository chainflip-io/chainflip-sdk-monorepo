/* eslint-disable no-console */
import { Queue } from 'bullmq';
import * as crypto from 'crypto';
import { Redis } from 'ioredis';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .map((arg) => arg.replace(/^--/, '').split('='))
    .map(([k, v]) => [k, v ?? 'true']),
) as {
  quoteRequestId?: string;
  marketMaker?: string;
  marketMakerRequestId?: string;
  errorMessage?: string;
  balance?: string;
  amount?: string;
  sellAsset?: string;
  srcAsset?: string;
  destAsset?: string;
  inputAmount?: string;
  skipRequest?: string;
  skipError?: string;
  publishOrderReceived?: string;
  orderReceivedLegs?: string;
};

const quoteRequestId = args.quoteRequestId ?? crypto.randomUUID();
const marketMaker = args.marketMaker ?? 'mock-mm';
const marketMakerRequestId = args.marketMakerRequestId ?? crypto.randomUUID();
const balance = args.balance ?? '100';
const amount = args.amount ?? '1000000000000000000';
const sellAsset = args.sellAsset ?? 'Btc';
const srcAsset = args.srcAsset ?? 'Btc';
const destAsset = args.destAsset ?? 'Eth';
const inputAmount = args.inputAmount ?? '1000000';

async function main() {
  const connection = new Redis(REDIS_URL, { maxRetriesPerRequest: null });
  const queue = new Queue('quote-events', { connection });

  if (args.skipRequest !== 'true') {
    const requestPayload = {
      quoteRequestId,
      srcAsset,
      destAsset,
      srcAssetIndexPrice: null,
      destAssetIndexPrice: null,
      inputAmount,
      inputValueUsd: '0',
      duration: '0',
      dcaQuoteParams: null,
      brokerCommissionBps: undefined,
      estimatedBoostFeeBps: undefined,
      maxBoostFeeBps: undefined,
      regularLimitOrders: null,
      dcaLimitOrders: null,
      success: false,
      regularQuote: null,
      dcaQuote: null,
      isInternalSwap: false,
      isVaultSwap: false,
      error: null,
      timestamp: new Date().toISOString(),
      event: 'quote.request.received',
    };

    await queue.add('quote.request.received', requestPayload, { removeOnComplete: false });
    console.log('[simulate] published quote.request.received', { quoteRequestId });
  }

  if (args.publishOrderReceived === 'true') {
    const legs = args.orderReceivedLegs
      ? JSON.parse(args.orderReceivedLegs)
      : [[[0, '1000000000000000000']]];
    const orderReceivedPayload = {
      quoteRequestId,
      marketMaker,
      marketMakerRequestId,
      legs,
      beta: false,
      timestamp: new Date().toISOString(),
      event: 'quote.order.received',
    };
    await queue.add('quote.order.received', orderReceivedPayload, { removeOnComplete: false });
    console.log('[simulate] published quote.order.received', { marketMakerRequestId, legs });
  }

  if (args.skipError !== 'true') {
    const errorMessage = args.errorMessage ?? 'insufficient balance';
    const isInsufficientBalance = errorMessage === 'insufficient balance';

    const errorPayload: Record<string, unknown> = {
      quoteRequestId,
      marketMaker,
      marketMakerRequestId,
      error: errorMessage,
      timestamp: new Date().toISOString(),
      event: 'quote.order.error',
    };

    if (isInsufficientBalance) {
      errorPayload.balance = balance;
      errorPayload.amount = amount;
      errorPayload.sellAsset = sellAsset;
    }

    await queue.add('quote.order.error', errorPayload, { removeOnComplete: false });
    console.log('[simulate] published quote.order.error', errorPayload);
  }

  await queue.close();
  await connection.quit();
}

main().catch((err) => {
  console.error('[simulate] fatal:', err);
  process.exit(1);
});
