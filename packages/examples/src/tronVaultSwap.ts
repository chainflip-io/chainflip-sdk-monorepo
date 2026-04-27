#!/usr/bin/env node --import=tsx --trace-uncaught --no-warnings

import { Wallet } from 'ethers';
import { TronWeb } from 'tronweb';
import { SwapSDK, Chains, Assets } from '@/sdk/swap/index.js';
import 'dotenv/config';

// TODO(TRON): Test this implementation works

if (!process.env.TRON_SECRET_KEY) {
  const account = TronWeb.createRandom();
  process.env.TRON_SECRET_KEY = account.privateKey;

  console.log('TRON_SECRET_KEY not set - generating random secret key');
  console.log('generated secret key', process.env.TRON_SECRET_KEY);
}

const tronWeb = new TronWeb({
  fullHost: 'https://nile.trongrid.io', // Nile testnet matches perseverance
  privateKey: process.env.TRON_SECRET_KEY,
});

const tronAddress = tronWeb.address.fromPrivateKey(process.env.TRON_SECRET_KEY as string);
console.log('wallet address', tronAddress);

// Destination is on Ethereum — use ETH_DEST_ADDRESS or generate a random address
const ethDestAddress = process.env.ETH_DEST_ADDRESS ?? Wallet.createRandom().address;
console.log('eth destination address', ethDestAddress);

const swapSDK = new SwapSDK({
  network: 'perseverance',
  enabledFeatures: { dca: true },
});

const { quotes } = await swapSDK.getQuoteV2({
  srcChain: Chains.Tron,
  srcAsset: Assets.TRX,
  destChain: Chains.Ethereum,
  destAsset: Assets.ETH,
  amount: (1000e6).toString(), // 1000 TRX in SUN
  isVaultSwap: true,
});

const quote = quotes.find((q) => q.type === 'REGULAR');
if (!quote) throw new Error('No quote');
console.log('quote', quote);

const vaultSwapData = await swapSDK.encodeVaultSwapData({
  quote,
  destAddress: ethDestAddress,
  fillOrKillParams: {
    slippageTolerancePercent: quote.recommendedSlippageTolerancePercent,
    refundAddress: tronAddress as string,
    retryDurationBlocks: 100,
    livePriceSlippageTolerancePercent: quote.recommendedLivePriceSlippageTolerancePercent,
  },
});
console.log('transactionData', vaultSwapData);
if (vaultSwapData.chain !== 'Tron') throw new Error('Invalid chain');

const { calldata, to, value, note, sourceTokenAddress } = vaultSwapData;

if (sourceTokenAddress) {
  const trc20Contract = await tronWeb.contract(
    [
      {
        name: 'approve',
        type: 'function',
        inputs: [
          { name: '_spender', type: 'address' },
          { name: '_value', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool' }],
      },
    ],
    sourceTokenAddress,
  );
  console.log('approving contract');
  await trc20Contract.approve(to, quote.depositAmount).send();
}

console.log('sending transaction');

// calldata = 0x<4-byte-selector><abi-encoded-params>
const selectorHex = calldata.slice(2, 10);
const paramsHex = calldata.slice(10);

const { transaction } = await tronWeb.transactionBuilder.triggerSmartContract(
  to,
  selectorHex,
  {
    callValue: Number(value),
    rawParameter: paramsHex,
    feeLimit: 100_000_000, // 100 TRX
  },
  [],
  tronAddress as string,
);

// note is Tron's memo field — lives in raw_data.data, separate from the contract calldata
const txWithNote = await tronWeb.transactionBuilder.addUpdateData(
  transaction,
  note.slice(2),
  'hex',
);
const signedTx = await tronWeb.trx.sign(txWithNote);
const receipt = await tronWeb.trx.sendRawTransaction(signedTx);

console.log(receipt.txid);
