#!/usr/bin/env node --import=tsx --trace-uncaught --no-warnings

import Client from 'bitcoin-core';
import * as bitcoin from 'bitcoinjs-lib';
import ECPairFactory from 'ecpair';
import * as secp256k1 from 'tiny-secp256k1';
import { SwapSDK, Chains, Assets } from '@/sdk/swap/index.js';
import 'dotenv/config';

const network = bitcoin.networks.testnet;

if (!process.env.BITCOIN_WALLET_WIF) {
  const randomKeypair = ECPairFactory(secp256k1).makeRandom({ network });
  process.env.BITCOIN_WALLET_WIF = randomKeypair.toWIF();

  console.log('BITCOIN_WALLET_WIF not set - generating random keypair');
  console.log('generated wif', process.env.BITCOIN_WALLET_WIF);
}

const swapSDK = new SwapSDK({
  network: 'perseverance',
  enabledFeatures: { dca: true },
});

const keypair = ECPairFactory(secp256k1).fromWIF(process.env.BITCOIN_WALLET_WIF, network);

const walletAddress = bitcoin.payments.p2wpkh({
  pubkey: Buffer.from(keypair.publicKey),
  network,
}).address!;
bitcoin.initEccLib(secp256k1);
console.log('wallet address', walletAddress);

const { quotes } = await swapSDK.getQuoteV2({
  srcChain: Chains.Bitcoin,
  srcAsset: Assets.BTC,
  destChain: Chains.Ethereum,
  destAsset: Assets.ETH,
  isVaultSwap: true,
  amount: (0.005e8).toString(),
});
const quote = quotes.find((q) => q.type === 'REGULAR')?.boostQuote;
if (!quote) throw new Error('No quote');
console.log('quote', quote);

const vaultSwapRequest = {
  quote,
  srcAddress: walletAddress,
  destAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
  fillOrKillParams: {
    slippageTolerancePercent: quote.recommendedSlippageTolerancePercent,
    refundAddress: walletAddress,
    retryDurationBlocks: 100,
    livePriceSlippageTolerancePercent: quote.recommendedLivePriceSlippageTolerancePercent,
  },
};
const vaultSwapData = await swapSDK.encodeVaultSwapData(vaultSwapRequest);
console.log(vaultSwapData);
if (vaultSwapData.chain !== 'Bitcoin') throw new Error('Invalid chain');

export const rpcClient = new Client({ host: 'https://bitcoin-testnet-rpc.publicnode.com' });
const inputUtxo = {
  txId: '80dd9e9264eb2ffa8a1dcaacf733355453bc6bdebc1fae9152605e21db6af0bc',
  outIndex: 2,
};

console.log('getting input transaction');
const inputTx = bitcoin.Transaction.fromHex(
  await rpcClient.command('getrawtransaction', inputUtxo.txId),
);
const txFeeSats = 5000;

console.log('creating transaction');
const tx = new bitcoin.Psbt({ network })
  .addInput({
    hash: inputTx.getHash(),
    index: inputUtxo.outIndex,
    nonWitnessUtxo: inputTx.toBuffer(),
    sequence: 0xfffffffd, // enable replace-by-fee
  })
  .addOutput({
    address: vaultSwapData.depositAddress,
    value: Number(quote.depositAmount),
  })
  .addOutput({
    script: bitcoin.payments.embed({
      data: [Buffer.from(vaultSwapData.nulldataPayload.replace('0x', ''), 'hex')],
      network,
    }).output!,
    value: 0,
  })
  .addOutput({
    address: walletAddress,
    value: inputTx.outs[inputUtxo.outIndex].value - Number(quote.depositAmount) - txFeeSats,
  })
  .signInput(0, {
    publicKey: Buffer.from(keypair.publicKey),
    sign: (hash) => Buffer.from(keypair.sign(hash)),
  })
  .finalizeAllInputs()
  .extractTransaction();

console.log('sending transaction');
await rpcClient.command('sendrawtransaction', tx.toHex());

console.log(tx.getId());
