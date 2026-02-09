import { swappingSwapRequested as schema200 } from '@chainflip/processor/200/swapping/swapRequested';
import { swappingSwapRequested as schema210 } from '@chainflip/processor/210/swapping/swapRequested';
import * as base58 from '@chainflip/utils/base58';
import { assetConstants, ChainflipAsset } from '@chainflip/utils/chainflip';
import { isNullish } from '@chainflip/utils/guard';
import assert from 'assert';
import { z } from 'zod';
import { formatTxRef } from '@/shared/common.js';
import { assertUnreachable } from '@/shared/functions.js';
import { assertNever } from '@/shared/guards.js';
import { pascalCaseToScreamingSnakeCase } from '@/shared/strings.js';
import { Prisma } from '../../client.js';
import { formatForeignChainAddress } from '../common.js';
import type { EventHandlerArgs } from '../index.js';

const schema = z.union([schema210.strict(), schema200.strict()]);

type RequestType = z.output<typeof schema>['requestType'];
type Origin = z.output<typeof schema>['origin'];
export type SwapRequestedArgs = z.input<typeof schema>;

const getRequestInfo = (requestType: RequestType) => {
  if (requestType.__kind === 'IngressEgressFee' || requestType.__kind === 'NetworkFee') {
    return { type: 'INTERNAL' as const };
  }

  if (requestType.__kind === 'Regular' || requestType.__kind === 'RegularNoNetworkFee') {
    if (requestType.outputAction.__kind === 'Egress') {
      return {
        type: 'EGRESS' as const,
        destAddress: requestType.outputAction.outputAddress.address,
        ccmMetadata: requestType.outputAction.ccmDepositMetadata,
      };
    }
    if (requestType.outputAction.__kind === 'CreditOnChain') {
      return {
        type: 'ON_CHAIN' as const,
        destAddress: requestType.outputAction.accountId,
      };
    }
    if (requestType.outputAction.__kind === 'CreditLendingPool') {
      return {
        type: 'LIQUIDATION' as const,
        borrower: requestType.outputAction.swapType.borrowerId,
        loanId: requestType.outputAction.swapType.loanId,
      };
    }

    if (requestType.outputAction.__kind === 'CreditFlipAndTransferToGateway') {
      return { type: 'ACCOUNT_CREATION' as const, lpAccountId: requestType.outputAction.accountId };
    }

    return assertNever(
      requestType.outputAction,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      `unexpected output action: ${(requestType.outputAction as any).__kind}`,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return assertNever(requestType, `unexpected request type: ${(requestType as any).__kind}`);
};

export const getVaultOriginTxRef = (
  origin: Extract<z.output<typeof schema>['origin'], { __kind: 'Vault' }>,
) => {
  const kind = origin.txId.__kind;

  switch (kind) {
    case 'Evm':
      return formatTxRef({ chain: 'Ethereum', data: origin.txId.value });
    case 'Bitcoin':
      return formatTxRef({ chain: 'Bitcoin', data: origin.txId.value });
    case 'Polkadot':
      return formatTxRef({ chain: 'Polkadot', data: origin.txId.value });
    case 'Solana':
    case 'None':
      return undefined;
    default:
      return assertUnreachable(kind);
  }
};

export const getOriginInfo = async (
  prisma: Prisma.TransactionClient,
  srcAsset: ChainflipAsset,
  origin: Origin,
  requestInfo: ReturnType<typeof getRequestInfo>,
) => {
  if (requestInfo.type === 'ACCOUNT_CREATION') {
    const channel = await prisma.accountCreationDepositChannel.findFirstOrThrow({
      where: { chain: assetConstants[srcAsset].chain, lpAccountId: requestInfo.lpAccountId },
      orderBy: { issuedBlock: 'desc' },
      include: { swapBeneficiaries: true },
    });

    return {
      originType: 'DEPOSIT_CHANNEL' as const,
      accountCreationDepositChannelId: channel.id,
      brokerId: channel.swapBeneficiaries[0].account,
    };
  }

  if (origin.__kind === 'DepositChannel') {
    const depositChannel = await prisma.swapDepositChannel.findFirstOrThrow({
      where: {
        srcChain: assetConstants[srcAsset].chain,
        depositAddress: origin.depositAddress.address,
        channelId: origin.channelId,
      },
      orderBy: {
        issuedBlock: 'desc',
      },
      select: { id: true },
    });

    return {
      originType: 'DEPOSIT_CHANNEL',
      swapDepositChannelId: depositChannel.id,
      brokerId: origin.brokerId,
    } as const;
  }

  if (origin.__kind === 'Vault') {
    return {
      originType: 'VAULT',
      depositTransactionRef: getVaultOriginTxRef(origin),
      brokerId: origin.brokerId,
    } as const;
  }

  if (origin.__kind === 'Internal') {
    return {
      originType: 'INTERNAL',
    } as const;
  }

  if (origin.__kind === 'OnChainAccount') {
    return {
      originType: 'ON_CHAIN',
      accountId: origin.value,
    } as const;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return assertNever(origin, `unexpected origin: ${(origin as any).__kind}`);
};

const extractRefundParameters = (
  priceLimitsAndExpiry: z.output<typeof schema>['priceLimitsAndExpiry'],
) => {
  if (!priceLimitsAndExpiry) return null;

  let fokRefundAddress;
  let fokRetryDurationBlocks;

  if (priceLimitsAndExpiry.expiryBehaviour.__kind === 'RefundIfExpires') {
    if (priceLimitsAndExpiry.expiryBehaviour.refundAddress.__kind === 'InternalAccount') {
      fokRefundAddress = priceLimitsAndExpiry.expiryBehaviour.refundAddress.value;
    } else if (priceLimitsAndExpiry.expiryBehaviour.refundAddress.__kind === 'ExternalAddress') {
      fokRefundAddress = formatForeignChainAddress(
        priceLimitsAndExpiry.expiryBehaviour.refundAddress.value,
      );
    }
    fokRetryDurationBlocks = priceLimitsAndExpiry.expiryBehaviour.retryDuration;
  } else if (priceLimitsAndExpiry.expiryBehaviour.__kind === 'NoExpiry') {
    // do nothing
  }

  return {
    fokMinPriceX128: priceLimitsAndExpiry.minPrice.toString(),
    fokRefundAddress,
    fokRetryDurationBlocks,
    fokMaxOraclePriceSlippageBps: priceLimitsAndExpiry.maxOraclePriceSlippage,
  };
};

const buildOnChainSwapInfo = (
  origin: Awaited<ReturnType<typeof getOriginInfo>>,
  requestInfo: ReturnType<typeof getRequestInfo>,
  refundParameters: ReturnType<typeof extractRefundParameters>,
) => {
  if (origin.originType !== 'ON_CHAIN') return null;
  assert(requestInfo.type === 'ON_CHAIN', 'expected on-chain request info');
  assert(origin.accountId === requestInfo.destAddress, 'expected matching account IDs');
  assert(
    isNullish(refundParameters) || refundParameters.fokRefundAddress === origin.accountId,
    'expected matching refund address',
  );

  return {
    srcAddress: origin.accountId,
    onChainSwapInfo: {
      create: {
        accountId: origin.accountId,
      },
    },
  };
};

export const buildLiquidationSwapInfo = (
  origin: Awaited<ReturnType<typeof getOriginInfo>>,
  requestInfo: ReturnType<typeof getRequestInfo>,
) => {
  if (requestInfo.type !== 'LIQUIDATION') return null;
  assert(
    origin.originType === 'INTERNAL',
    'expected originType to be INTERNAL for liquidation swap',
  );

  const { borrower, loanId } = requestInfo;

  return {
    liquidationSwapInfo: {
      create: {
        accountId: borrower,
        loanId,
      },
    },
  } as const;
};

export default async function swapRequested({
  prisma,
  event,
  block,
}: EventHandlerArgs): Promise<void> {
  const {
    inputAmount,
    inputAsset,
    swapRequestId,
    outputAsset,
    origin,
    requestType,
    dcaParameters,
    priceLimitsAndExpiry,
    brokerFees,
  } = schema.parse(event.args);

  const requestInfo = getRequestInfo(requestType);

  const originInfo = await getOriginInfo(prisma, inputAsset, origin, requestInfo);

  const {
    originType,
    swapDepositChannelId,
    depositTransactionRef,
    brokerId,
    accountCreationDepositChannelId,
  } = originInfo;

  const { destAddress, ccmMetadata } = requestInfo;

  const beneficiaries = brokerFees
    .map(({ account, bps: commissionBps }) => ({
      type: account === brokerId ? ('SUBMITTER' as const) : ('AFFILIATE' as const),
      account,
      commissionBps,
    }))
    .filter(({ commissionBps }) => commissionBps > 0);

  const totalCommissionBps = beneficiaries.reduce(
    (acc, { commissionBps }) => acc + commissionBps,
    0,
  );

  const fokParams = extractRefundParameters(priceLimitsAndExpiry);

  const swapRequest = await prisma.swapRequest.create({
    data: {
      nativeId: swapRequestId,
      originType,
      depositTransactionRef,
      swapDepositChannelId,
      accountCreationDepositChannelId,
      srcAsset: inputAsset,
      destAsset: outputAsset,
      requestType: pascalCaseToScreamingSnakeCase(requestType.__kind),
      ccmGasBudget: ccmMetadata?.channelMetadata.gasBudget.toString(),
      ccmMessage: ccmMetadata?.channelMetadata.message,
      srcAddress: ccmMetadata?.sourceAddress?.address,
      destAddress,
      swapRequestedAt: new Date(block.timestamp),
      swapRequestedBlockIndex: `${block.height}-${event.indexInBlock}`,
      swapInputAmount: inputAmount.toString(),
      ...(origin.__kind !== 'Internal' &&
        origin.__kind !== 'OnChainAccount' && {
          depositAmount: inputAmount.toString(),
        }),
      dcaNumberOfChunks: dcaParameters?.numberOfChunks,
      dcaChunkIntervalBlocks: dcaParameters?.chunkInterval,
      ...fokParams,
      totalBrokerCommissionBps: totalCommissionBps,
      beneficiaries: {
        createMany: {
          data: beneficiaries,
        },
      },
      ...buildOnChainSwapInfo(originInfo, requestInfo, fokParams),
      ...buildLiquidationSwapInfo(originInfo, requestInfo),
    },
  });

  if (
    assetConstants[inputAsset].chain === 'Solana' &&
    originType !== 'INTERNAL' &&
    originType !== 'ON_CHAIN'
  ) {
    let pendingTxRefInfo;
    if (originType === 'DEPOSIT_CHANNEL') {
      pendingTxRefInfo = { swapDepositChannelId, accountCreationDepositChannelId };
    } else if (originType === 'VAULT') {
      assert(origin.__kind === 'Vault' && origin.txId.__kind === 'Solana');
      pendingTxRefInfo = {
        address: base58.encode(origin.txId.value[0]),
        slot: origin.txId.value[1],
        vaultSwapRequestId: swapRequest.id,
      };
    } else {
      assertUnreachable(originType, `unexpected origin: ${originType}`);
    }

    await prisma.solanaPendingTxRef.create({ data: pendingTxRefInfo });
  }
}
