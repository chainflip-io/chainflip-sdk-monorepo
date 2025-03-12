#!/usr/bin/env node --import=tsx --trace-uncaught --no-warnings

import { SwapSDK, Chains, Assets } from '@/sdk/swap/index.js';
import 'dotenv/config';

const swapSDK = new SwapSDK({
  network: 'perseverance',
  enabledFeatures: { dca: true },
  broker: { url: 'http://10.5.2.143:8080/ ' },
});

const { quotes } = await swapSDK.getQuoteV2({
  srcChain: Chains.Ethereum,
  srcAsset: Assets.USDC,
  destChain: Chains.Solana,
  destAsset: Assets.SOL,
  amount: (500e6).toString(),
});

const quote = quotes.find((q) => q.type === 'REGULAR');
if (!quote) throw new Error('No quote');
console.log('quote', quote);

const channel = await swapSDK.requestDepositAddressV2({
  quote,
  destAddress: '3tV35UV7rvHqYK4zvqKXaTPBESw9QxGP7LpQRcNHjdDZ',
  fillOrKillParams: {
    slippageTolerancePercent: quote.recommendedSlippageTolerancePercent,
    refundAddress: '0xcDb829647668b72D6046a1b5fA852De553261030',
    retryDurationBlocks: 100,
  },
  ccmParams: {
    message: '0x010000002f010064000184ff44ab00000000f401',
    gasBudget: '1450000',
    ccmAdditionalData:
      '0x007417da8b99d7748127a76b03d61fee69c80dfef73ad2d5503737beedc5a9ed480008b78b2094a85d94fccab50ffb07c8492382f2eb6eb4a8ea94a7d84686f2a8bac20043922bdabbe135d77fd58311bf529e29604bb220cb7f90033987c7395cdf47f70162cefae0327767424c7a553077c91c8e4c9918230395aa8b6baf7dd33b5151f6',
  },
});
console.log(channel);
