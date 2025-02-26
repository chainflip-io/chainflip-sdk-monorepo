import { SwapSDK, Chains, Assets } from '@chainflip/sdk/swap';
import Client from 'bitcoin-core';
import * as bitcoin from 'bitcoinjs-lib';
import ECPairFactory from 'ecpair';
import * as secp256k1 from 'tiny-secp256k1';
import 'dotenv/config';

if (!process.env.BITCOIN_WALLET_WIF) {
  const randomKeypair = ECPairFactory(secp256k1).makeRandom();
  process.env.BITCOIN_WALLET_WIF = randomKeypair.toWIF();

  console.log('BITCOIN_WALLET_WIF not set - generating random keypair');
  console.log('generated wif', process.env.BITCOIN_WALLET_WIF);
}

// Initialize SDK
const swapSDK = new SwapSDK({
  network: 'perseverance',
  enabledFeatures: { dca: true },
});

const keypair = ECPairFactory(secp256k1).fromWIF(process.env.BITCOIN_WALLET_WIF);
const network = bitcoin.networks.testnet;
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
  amount: (0.005e8).toString(), // 0.005 BTC
});
const quote = quotes.find((q) => q.type === 'REGULAR');
if (!quote) throw new Error('No quote');
console.log('quote', quote);

const vaultSwapRequest = {
  quote,
  srcAddress: 'tb1p8p3xsgaeltylmvyrskt3mup5x7lznyrh7vu2jvvk7mn8mhm6clksl5k0sm',
  destAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
  fillOrKillParams: {
    slippageTolerancePercent: quote.recommendedSlippageTolerancePercent,
    refundAddress: 'tb1p8p3xsgaeltylmvyrskt3mup5x7lznyrh7vu2jvvk7mn8mhm6clksl5k0sm',
    retryDurationBlocks: 100,
  },
};
const vaultSwapData = await swapSDK.encodeVaultSwapData(vaultSwapRequest);
console.log(vaultSwapData);
if (vaultSwapData.chain !== 'Bitcoin') throw new Error('Invalid chain');

export const rpcClient = new Client({ host: 'https://bitcoin-testnet-rpc.publicnode.com' });
const inputUxto = {
  txId: 'df8f78afe35ee28d52748e964b1de73ddb96b85091dd387ab1835b398a65b642',
  outIndex: 2,
};
const inputTx = bitcoin.Transaction.fromHex(
  await rpcClient.command('getrawtransaction', inputUxto.txId),
);
const txFeeSats = 50000;

const tx = new bitcoin.Psbt({ network })
  .addInput({
    hash: inputTx.getHash(),
    index: inputUxto.outIndex,
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
    value: inputTx.outs[inputUxto.outIndex].value - Number(quote.depositAmount) - txFeeSats,
  })
  .signInput(0, {
    publicKey: Buffer.from(keypair.publicKey),
    sign: (hash) => Buffer.from(keypair.sign(hash)),
  })
  .finalizeAllInputs()
  .extractTransaction();
await rpcClient.command('sendrawtransaction', tx.toHex());

console.log(tx.getId());
