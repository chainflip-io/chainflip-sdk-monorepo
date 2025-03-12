import { findVaultSwapData } from '@chainflip/solana/deposit';
import { isTruthy } from '@chainflip/utils/guard';
import { hexEncodeNumber } from '@chainflip/utils/number';
import { Chain, Chains, InternalAsset, assetConstants } from '@/shared/enums';
import RedisClient from '@/shared/node-apis/redis';
import { getTransactionRefChains } from '@/swap/utils/transactionRef';
import prisma, { Broadcast } from '../client';
import env from '../config/env';
import { handleExit } from '../utils/function';
import logger from '../utils/logger';

const redis = env.REDIS_URL ? new RedisClient(env.REDIS_URL) : undefined;

if (redis) handleExit(() => redis.quit());

export type PendingDeposit = {
  amount: string;
  txRef?: string;
  txConfirmations: number;
};

const getMempoolTransaction = async (
  chain: Chain,
  address: string,
): Promise<PendingDeposit | null> => {
  if (!redis) return null;

  if (chain === Chains.Bitcoin) {
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

async function getDepositConfirmationCount(depositChain: Chain, depositBlockHeight: number) {
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
  internalAsset: InternalAsset,
  address: string,
): Promise<PendingDeposit | null> => {
  if (!redis) return null;

  const { chain, asset } = assetConstants[internalAsset];

  try {
    const [deposits, tracking] = await Promise.all([
      redis.getDeposits(chain, asset, address),
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
    logger.error('error while looking up deposit in redis', { error });
    return null;
  }
};

export const getPendingBroadcast = async (broadcast: Broadcast) => {
  if (!redis) return null;
  try {
    return await redis.getBroadcast(broadcast.chain, broadcast.nativeId);
  } catch (error) {
    logger.error('error while looking up broadcast in redis', { error });
    return null;
  }
};

export const getPendingVaultSwap = async (txRef: string) => {
  const resultPromises = getTransactionRefChains(txRef).map(async (chain) => {
    let result = redis ? await redis.getPendingVaultSwap(chain, txRef) : null;

    if (!result && chain === 'Solana' && env.SOLANA_RPC_HTTP_URL) {
      const txData = await findVaultSwapData(env.SOLANA_RPC_HTTP_URL, txRef);
      result = txData && {
        amount: BigInt(txData.depositAmount),
        destinationAddress: txData.destinationAddress,
        inputAsset: txData.sourceAsset as InternalAsset,
        outputAsset: txData.destinationAsset as InternalAsset,
        depositChainBlockHeight: null,
        brokerFee: txData.cfParams.brokerFees,
        affiliateFees: txData.cfParams.affiliateFees.map((fee) => ({
          account: '', // transaction data includes registration id only
          commissionBps: fee.commissionBps,
        })),
        maxBoostFee: txData.cfParams.boostFee,
        dcaParams: txData.cfParams.dcaParams && {
          chunkInterval: txData.cfParams.dcaParams.chunkIntervalBlocks,
          numberOfChunks: txData.cfParams.dcaParams.numberOfChunks,
        },
        refundParams: txData.cfParams.refundParams && {
          refundAddress: txData.cfParams.refundParams.refundAddress,
          minPrice: BigInt(txData.cfParams.refundParams.minPriceX128),
          retryDuration: txData.cfParams.refundParams.retryDurationBlocks,
        },
        ccmDepositMetadata: txData.ccmParams && {
          channelMetadata: {
            message: txData.ccmParams.message,
            gasBudget: hexEncodeNumber(BigInt(txData.ccmParams.gasAmount)),
          },
        },
      };
    }

    return result;
  });

  try {
    const results = await Promise.all(resultPromises);
    const vaultSwap = results.find(isTruthy);
    if (!vaultSwap) return null;

    const txConfirmations =
      vaultSwap.depositChainBlockHeight &&
      (await getDepositConfirmationCount(
        assetConstants[vaultSwap.inputAsset].chain,
        vaultSwap.depositChainBlockHeight,
      ));
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
    logger.error('error while looking up vault swap in redis', { error });
    return null;
  }
};
