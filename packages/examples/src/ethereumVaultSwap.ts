import { getDefaultProvider, Wallet, Contract } from 'ethers';
import { SwapSDK, Chains, Assets } from '@/sdk/swap/index.js';
import 'dotenv/config';

if (!process.env.ETHEREUM_SECRET_KEY) {
  const randomWallet = Wallet.createRandom();
  process.env.ETHEREUM_SECRET_KEY = randomWallet.privateKey;

  console.log('ETHEREUM_SECRET_KEY not set - generating random secret key');
  console.log('generated secret key', process.env.ETHEREUM_SECRET_KEY);
}

const swapSDK = new SwapSDK({
  network: 'perseverance',
  enabledFeatures: { dca: true },
  // broker: {url: 'http://10.5.2.143:8080/ '}
});

const wallet = new Wallet(process.env.ETHEREUM_SECRET_KEY as string, getDefaultProvider('sepolia'));
console.log('wallet address', wallet.address);

const { quotes } = await swapSDK.getQuoteV2({
  srcChain: Chains.Ethereum,
  srcAsset: Assets.USDC,
  destChain: Chains.Ethereum,
  destAsset: Assets.FLIP,
  amount: (500e6).toString(),
  isVaultSwap: true,
});

const quote = quotes.find((q) => q.type === 'REGULAR');
if (!quote) throw new Error('No quote');
console.log('quote', quote);

const vaultSwapData = await swapSDK.encodeVaultSwapData({
  quote,
  destAddress: wallet.address,
  fillOrKillParams: {
    slippageTolerancePercent: quote.recommendedSlippageTolerancePercent,
    refundAddress: wallet.address,
    retryDurationBlocks: 100,
  },
});
console.log('transactionData', vaultSwapData);
if (vaultSwapData.chain !== 'Ethereum') throw new Error('Invalid chain');

if (vaultSwapData.sourceTokenAddress) {
  const sourceTokenContract = new Contract(
    vaultSwapData.sourceTokenAddress,
    ['function approve(address spender, uint256 value) returns (bool)'],
    wallet,
  );
  const approvalTx = await sourceTokenContract.approve(vaultSwapData.to, quote.depositAmount);
  await approvalTx.wait();
}

const swapTx = await wallet.sendTransaction({
  to: vaultSwapData.to,
  data: vaultSwapData.calldata,
  value: vaultSwapData.value,
});
const receipt = await swapTx.wait();

console.log(receipt?.hash);
