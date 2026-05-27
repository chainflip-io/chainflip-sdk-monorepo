#!/usr/bin/env node --import=tsx --trace-uncaught --no-warnings

import { SwapSDK, Chains, Assets } from '@/sdk/swap/index.js';
import 'dotenv/config';

const swapSDK = new SwapSDK({
  network: 'perseverance',
  enabledFeatures: { dcaV2: true },
});

// CCM params
const ccmGasBudget = '10000';
const ccmMessage = '0xdeadbeef';

const quoteAmount = (0.001e18).toString();
const ethRefundAddress = '0x37876B47DEE43492DAC3d87F7682df52dDBC65Ca';
const tronDestAddress = 'TPvGoFxzYMj932E1u8msYLncEtHhAruQdN';

const { quotes } = await swapSDK.getQuoteV2({
  srcChain: Chains.Ethereum,
  srcAsset: Assets.ETH,
  destChain: Chains.Tron,
  destAsset: Assets.TRX,
  amount: quoteAmount,
  ccmParams: {
    gasBudget: ccmGasBudget,
    messageLengthBytes: Math.ceil((ccmMessage.length - 2) / 2),
  },
});

const quote = quotes.find((q) => q.type === 'REGULAR');
if (!quote) throw new Error('No quote');
console.log('quote', quote);

const channel = await swapSDK.requestDepositAddressV2({
  quote,
  destAddress: tronDestAddress,
  fillOrKillParams: {
    slippageTolerancePercent: quote.recommendedSlippageTolerancePercent,
    refundAddress: ethRefundAddress,
    retryDurationBlocks: 2,
    livePriceSlippageTolerancePercent: quote.recommendedLivePriceSlippageTolerancePercent,
  },
  ccmParams: {
    gasBudget: ccmGasBudget,
    message: ccmMessage,
  },
});

console.log('request deposit address response', channel);
