#!/usr/bin/env node --import=tsx --trace-uncaught --no-warnings

import {
  PublicKey,
  Keypair,
  sendAndConfirmTransaction,
  TransactionInstruction,
  Transaction,
  Connection,
  clusterApiUrl,
} from '@solana/web3.js';
import bs58 from 'bs58';
import { SwapSDK, Chains, Assets } from '@/sdk/swap/index.js';
import 'dotenv/config';

if (!process.env.SOLANA_SECRET_KEY_BASE58) {
  const randomKeypair = Keypair.generate();
  process.env.SOLANA_SECRET_KEY_BASE58 = bs58.encode(randomKeypair.secretKey);

  console.log('ETHEREUM_SECRET_KEY not set - generating random keypair');
  console.log('generated secret key', process.env.SOLANA_SECRET_KEY_BASE58);
}

const swapSDK = new SwapSDK({
  network: 'perseverance',
  enabledFeatures: { dca: true },
});

const keypair = Keypair.fromSecretKey(bs58.decode(process.env.SOLANA_SECRET_KEY_BASE58));
const dataAccountKeypair = Keypair.generate(); // temporary account to store the swap details
console.log('wallet address', keypair.publicKey.toBase58());

const { quotes } = await swapSDK.getQuoteV2({
  srcChain: Chains.Solana,
  srcAsset: Assets.SOL,
  destChain: Chains.Ethereum,
  destAsset: Assets.ETH,
  isVaultSwap: true,
  amount: (1.5e9).toString(), // 1.5 SOL
});
const quote = quotes.find((q) => q.type === 'REGULAR');
if (!quote) throw new Error('No quote');
console.log('quote', quote);

const vaultSwapRequest = {
  quote,
  srcAddress: keypair.publicKey.toBase58(),
  destAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
  fillOrKillParams: {
    slippageTolerancePercent: quote.recommendedSlippageTolerancePercent,
    refundAddress: keypair.publicKey.toBase58(),
    retryDurationBlocks: 100,
  },
  extraParams: {
    seed: '0x000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f' as const,
  },
};
const vaultSwapData = await swapSDK.encodeVaultSwapData(vaultSwapRequest);
console.log(vaultSwapData);
if (vaultSwapData.chain !== 'Solana') throw new Error('Invalid chain');

const transaction = new Transaction().add(
  new TransactionInstruction({
    keys: vaultSwapData.accounts.map((account) => ({
      pubkey: new PublicKey(account.pubkey),
      isSigner: account.isSigner,
      isWritable: account.isWritable,
    })),
    programId: new PublicKey(vaultSwapData.programId),
    data: Buffer.from(vaultSwapData.data.slice(2), 'hex'),
  }),
);

const signature = await sendAndConfirmTransaction(
  new Connection(clusterApiUrl('devnet'), 'confirmed'),
  transaction,
  [keypair, dataAccountKeypair],
);
console.log(signature);
