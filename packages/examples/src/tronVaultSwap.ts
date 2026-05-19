#!/usr/bin/env node --import=tsx --trace-uncaught --no-warnings

import { Wallet } from 'ethers';
import { TronWeb } from 'tronweb';
import { SwapSDK, Chains, Assets } from '@/sdk/swap/index.js';
import 'dotenv/config';

type PickTronAsset = 'Trx' | 'TrxUsdt';
const pickAsset: PickTronAsset = 'Trx';

const srcAsset = pickAsset === 'Trx' ? Assets.TRX : Assets.USDT;
const swapAmount = (50e6).toString(); // 50 USDT (6 decimals) or 50 TRX in sun

if (!process.env.TRON_SECRET_KEY) {
  const account = TronWeb.createRandom();
  // TronWeb expects private keys without the 0x prefix
  process.env.TRON_SECRET_KEY = account.privateKey.replace(/^0x/, '');
  console.log('TRON_SECRET_KEY not set - generated random secret key', process.env.TRON_SECRET_KEY);
}

const privateKey = process.env.TRON_SECRET_KEY.replace(/^0x/, '');

const tronWeb = new TronWeb({
  fullHost: 'https://nile.trongrid.io', // Nile testnet matches perseverance
  // fullHost: 'http://chainflip-backspin:8090',
  privateKey,
});

const tronAddress = tronWeb.address.fromPrivateKey(privateKey);
console.log('wallet address', tronAddress);
console.log('swapping', swapAmount, srcAsset);

// Destination is on Ethereum — use ETH_DEST_ADDRESS or generate a random address
const ethDestAddress = process.env.ETH_DEST_ADDRESS ?? Wallet.createRandom().address;
console.log('eth destination address', ethDestAddress);

const swapSDK = new SwapSDK({
  network: 'perseverance',
  // network: 'backspin',
  enabledFeatures: { dcaV2: true },
  // broker: { url: 'https://rpc.backspin.chainflip.io' },
});

const { quotes } = await swapSDK.getQuoteV2({
  srcChain: Chains.Tron,
  srcAsset,
  destChain: Chains.Ethereum,
  destAsset: Assets.USDC,
  amount: swapAmount,
  isVaultSwap: true,
});

const quote = quotes.find((q) => q.type === 'REGULAR');
if (!quote) throw new Error('No quote');
console.log('quote', quote);

console.log('requesting encode vault swap data...');
const vaultSwapData = await swapSDK.encodeVaultSwapData({
  quote,
  destAddress: ethDestAddress,
  fillOrKillParams: {
    slippageTolerancePercent: quote.recommendedSlippageTolerancePercent,
    refundAddress: tronAddress as string,
    retryDurationBlocks: 10,
    livePriceSlippageTolerancePercent: quote.recommendedLivePriceSlippageTolerancePercent,
  },
});
console.log('vaultSwapData', vaultSwapData);
if (vaultSwapData.chain !== 'Tron') throw new Error('Invalid chain');

const { to, value, note, sourceTokenAddress } = vaultSwapData;

let transaction;

if (sourceTokenAddress) {
  // TRC-20 (USDT): call transfer(vault, amount) on the token contract.
  // The note is attached separately and identifies the swap to Chainflip.
  const { transaction: trc20Tx } = await tronWeb.transactionBuilder.triggerSmartContract(
    sourceTokenAddress,
    'transfer(address,uint256)',
    { feeLimit: 100_000_000 },
    [
      { type: 'address', value: to },
      { type: 'uint256', value: BigInt(swapAmount).toString() },
    ],
    tronAddress as string,
  );
  transaction = trc20Tx;
} else {
  // Native TRX: send TRX directly to the Chainflip Vault address.
  transaction = await tronWeb.transactionBuilder.sendTrx(
    to,
    Number(value), // value is in sun (1 TRX = 1,000,000 sun)
    tronAddress as string,
  );
}

// Attach swap parameters as a note — this is what identifies the transaction to Chainflip
transaction = await tronWeb.transactionBuilder.addUpdateData(
  transaction,
  note.slice(2), // strip leading 0x
  'hex',
);

const signedTx = await tronWeb.trx.sign(transaction);
const receipt = await tronWeb.trx.sendRawTransaction(signedTx);

if (!receipt.result) {
  throw new Error(`Transaction failed: ${receipt.code || 'unknown error'}`);
}

console.log('txid', receipt.txid);
