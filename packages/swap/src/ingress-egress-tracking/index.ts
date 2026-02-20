import { findVaultSwapData as findBitcoinVaultSwapData } from '@chainflip/bitcoin';
import RedisClient from '@chainflip/redis';
import { findVaultSwapData as findSolanaVaultSwapData } from '@chainflip/solana';
import {
  AnyChainflipAsset,
  assetConstants,
  ChainflipChain,
  isLegacyChainflipAsset,
  isLegacyChainflipChain,
} from '@chainflip/utils/chainflip';
import { isTruthy } from '@chainflip/utils/guard';
import { inspect } from 'util';
import prisma, { Broadcast } from '../client.js';
import env from '../config/env.js';
import { handleExit } from '../utils/function.js';
import logger from '../utils/logger.js';
import { getTransactionRefChains } from '../utils/transactionRef.js';

const redis = env.REDIS_URL ? new RedisClient(env.REDIS_URL) : undefined;

if (redis) handleExit(() => redis.quit());

export type PendingDeposit = {
  amount: string;
  txRef?: string;
  txConfirmations: number;
};

const getMempoolTransaction = async (
  chain: ChainflipChain,
  address: string,
): Promise<PendingDeposit | null> => {
  if (!redis) return null;

  if (chain === 'Bitcoin') {
    const tx = await redis.getMempoolTransaction('Bitcoin', address);

    if (tx) {
      return {
        amount: tx.value.toString(),
        txConfirmations: tx.confirmations,
        txRef: tx.tx_hash,
      };
    }
  }

  return null;
};

async function getDepositConfirmationCount(
  depositChain: ChainflipChain,
  depositBlockHeight: number,
) {
  const [tracking, state] = await Promise.all([
    prisma.chainTracking.findFirst({ where: { chain: depositChain } }),
    prisma.state.findFirstOrThrow(),
  ]);
  if (!tracking) return 0;

  // deposits in an external block will be witnessed (and boosted) one stateChain block after chain tracking is updated
  // to prevent jumping from "1 confirmation" to "checking boost liquidity", we need to calculate confirmations based on the last witnessed block
  const stateChainBlocksSinceTracking = state.height - (tracking.eventWitnessedBlock ?? 0);
  const lastWitnessedBlockHeight =
    stateChainBlocksSinceTracking > 0 ? tracking.height : tracking.previousHeight;

  return Math.max(0, Number(lastWitnessedBlockHeight) - depositBlockHeight + 1);
}

export const getPendingDeposit = async (
  internalAsset: AnyChainflipAsset,
  address: string,
): Promise<PendingDeposit | null> => {
  if (!redis) return null;
  if (isLegacyChainflipAsset(internalAsset)) return null;

  const { chain } = assetConstants[internalAsset];

  try {
    const [deposits, tracking] = await Promise.all([
      redis.getDeposits(internalAsset, address),
      prisma.chainTracking.findFirst({ where: { chain } }),
    ]);

    if (deposits.length === 0 || tracking == null) {
      // there is a delay between the tx getting included and the ingress egress tracker detecting the pending deposit
      // to prevent jumping confirmation numbers, we use 0 until the ingress egress tracker detects the pending deposit
      const mempoolTx = await getMempoolTransaction(chain, address);
      return mempoolTx && { ...mempoolTx, txConfirmations: 0 };
    }

    const txConfirmations = await getDepositConfirmationCount(
      chain,
      deposits[0].deposit_chain_block_height,
    );

    return {
      amount: deposits[0].amount.toString(),
      txConfirmations,
      txRef: deposits[0].tx_refs?.[0],
    };
  } catch (error) {
    logger.error('error while looking up deposit in redis', { error: inspect(error) });
    return null;
  }
};

export const getPendingBroadcast = async (broadcast: Broadcast) => {
  if (!redis || isLegacyChainflipChain(broadcast.chain)) return null;
  try {
    return await redis.getBroadcast(broadcast.chain, broadcast.nativeId);
  } catch (error) {
    logger.error('error while looking up broadcast in redis', { error: inspect(error) });
    return null;
  }
};

export const getPendingVaultSwap = async (txRef: string) => {
  const resultPromises = getTransactionRefChains(txRef).map(async (chain) => {
    let result = redis ? await redis.getPendingVaultSwap(chain, txRef) : null;

    if (!result) {
      let txData = null;
      if (chain === 'Solana' && env.SOLANA_RPC_HTTP_URL) {
        txData = await findSolanaVaultSwapData(env.SOLANA_RPC_HTTP_URL, txRef);
      } else if (chain === 'Bitcoin' && env.BITCOIN_RPC_HTTP_URL) {
        txData = await findBitcoinVaultSwapData(env.BITCOIN_RPC_HTTP_URL, txRef);
      }

      result = txData && {
        ...txData,
        affiliateFees: txData.affiliateFees.map((fee) => ({
          account: '', // transaction data includes registration id only
          commissionBps: fee.commissionBps,
        })),
        brokerFee: {
          account: txData.brokerFee.account ?? '', // bitcoin transaction data does not include broker account
          commissionBps: txData.brokerFee.commissionBps,
        },
      };
    }

    return result;
  });

  try {
    const results = await Promise.all(resultPromises);
    const vaultSwap = results.find(isTruthy);
    if (!vaultSwap) return null;

    const txConfirmations = vaultSwap.depositChainBlockHeight
      ? await getDepositConfirmationCount(
          assetConstants[vaultSwap.inputAsset].chain,
          vaultSwap.depositChainBlockHeight,
        )
      : 0;
    const { inputAsset, outputAsset, destinationAddress, maxBoostFee, ...remainingData } =
      vaultSwap;

    return {
      txRef,
      txConfirmations,
      srcAsset: inputAsset,
      destAsset: outputAsset,
      destAddress: destinationAddress,
      maxBoostFeeBps: maxBoostFee,
      ...remainingData,
    };
  } catch (error) {
    logger.error('error while looking up vault swap in redis', { error: inspect(error) });
    return null;
  }
};
