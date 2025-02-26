import { SwapSDK, Chains, Assets } from '@chainflip/sdk/swap';
import { getDefaultProvider, Wallet, Contract } from 'ethers';
import 'dotenv/config';

if (!process.env.ETHEREUM_SECRET_KEY) {
  const randomWallet = Wallet.createRandom();
  process.env.ETHEREUM_SECRET_KEY = randomWallet.privateKey;

  console.log('ETHEREUM_SECRET_KEY not set - generating random secret key');
  console.log('generated secret key', process.env.ETHEREUM_SECRET_KEY);
}

// Initialize SDK
const swapSDK = new SwapSDK({
  network: 'perseverance',
  enabledFeatures: { dca: true },
  // broker: {url: 'http://10.5.2.143:8080/ '}
});

const wallet = new Wallet(process.env.ETHEREUM_SECRET_KEY as string, getDefaultProvider('sepolia'));
console.log('wallet address', wallet.address);

// Fetch quote for swap
const { quotes } = await swapSDK.getQuoteV2({
  srcChain: Chains.Ethereum,
  srcAsset: Assets.USDC,
  destChain: Chains.Ethereum,
  destAsset: Assets.FLIP,
  amount: (500e6).toString(), // 500 USDC
  isVaultSwap: true,
});

// Find regular quote
const quote = quotes.find((q) => q.type === 'REGULAR');
if (!quote) throw new Error('No quote');
console.log('quote', quote);

// Encode vault swap transaction data
const vaultSwapData = await swapSDK.encodeVaultSwapData({
  quote,
  destAddress: wallet.address,
  fillOrKillParams: {
    slippageTolerancePercent: quote.recommendedSlippageTolerancePercent, // use recommended slippage tolerance from quote
    refundAddress: '0xCB583C817964a2c527608f8b813a4c9BdDb559a9', // address to which assets are refunded
    retryDurationBlocks: 100, // 100 blocks * 6 seconds = 10 minutes before deposits are refunded
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

// Sign and submit transaction
const swapTx = await wallet.sendTransaction({
  to: vaultSwapData.to,
  data: vaultSwapData.calldata,
  value: vaultSwapData.value,
});
const receipt = await swapTx.wait(); // wait for transaction to be included in a block

console.log(receipt?.hash);
