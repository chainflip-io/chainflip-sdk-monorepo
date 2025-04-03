import type { Prisma } from '.prisma/client';
import { HandlerMap } from '@chainflip/processor';
import type { Semver } from '@chainflip/processor/types';
import { Chains } from '@/shared/enums';
import broadcastAborted from './broadcaster/broadcastAborted';
import broadcastSuccess from './broadcaster/broadcastSuccess';
import thresholdSignatureInvalid from './broadcaster/thresholdSignatureInvalid';
import transactionBroadcastRequest from './broadcaster/transactionBroadcastRequest';
import batchBroadcastRequested from './ingress-egress/batchBroadcastRequested';
import { boostPoolCreated } from './ingress-egress/boostPoolCreated';
import networkCcmBroadcastRequested from './ingress-egress/ccmBroadcastRequested';
import { depositBoosted } from './ingress-egress/depositBoosted';
import networkDepositFailed from './ingress-egress/depositFailed';
import { depositFinalised } from './ingress-egress/depositFinalised';
import { insufficientBoostLiquidity } from './ingress-egress/insufficientBoostLiquidity';
import transactionRejectedByBroker from './ingress-egress/transactionRejectedByBroker';
import newPoolCreated from './liquidity-pools/newPoolCreated';
import poolFeeSet from './liquidity-pools/poolFeeSet';
import liquidityDepositAddressReady from './liquidity-provider/liquidityDepositAddressReady';
import creditedOnChain from './swapping/creditedOnChain';
import refundedOnChain from './swapping/refundedOnChain';
import refundEgressIgnored from './swapping/refundEgressIgnored';
import refundEgressScheduled from './swapping/refundEgressScheduled';
import swapDepositAddressReady from './swapping/swapDepositAddressReady';
import swapEgressIgnored from './swapping/swapEgressIgnored';
import swapEgressScheduled from './swapping/swapEgressScheduled';
import swapExecuted from './swapping/swapExecuted';
import swapRequestCompleted from './swapping/swapRequestCompleted';
import swapRequested from './swapping/swapRequested';
import swapRescheduled from './swapping/swapRescheduled';
import swapScheduled from './swapping/swapScheduled';
import chainStateUpdated from './tracking/chainStateUpdated';
import type { Block, Event } from '../gql/generated/graphql';

export const events = {
  LiquidityPools: {
    NewPoolCreated: 'LiquidityPools.NewPoolCreated',
    PoolFeeSet: 'LiquidityPools.PoolFeeSet',
  },
  LiquidityProvider: {
    LiquidityDepositAddressReady: 'LiquidityProvider.LiquidityDepositAddressReady',
  },
  Swapping: {
    SwapScheduled: 'Swapping.SwapScheduled',
    SwapRescheduled: 'Swapping.SwapRescheduled',
    SwapExecuted: 'Swapping.SwapExecuted',
    SwapEgressIgnored: 'Swapping.SwapEgressIgnored',
    RefundEgressIgnored: 'Swapping.RefundEgressIgnored',
    SwapEgressScheduled: 'Swapping.SwapEgressScheduled',
    RefundEgressScheduled: 'Swapping.RefundEgressScheduled',
    SwapDepositAddressReady: 'Swapping.SwapDepositAddressReady',
    SwapRequested: 'Swapping.SwapRequested',
    SwapRequestCompleted: 'Swapping.SwapRequestCompleted',
    CreditedOnChain: 'Swapping.CreditedOnChain',
    RefundedOnChain: 'Swapping.RefundedOnChain',
  },
  BitcoinIngressEgress: {
    BatchBroadcastRequested: 'BitcoinIngressEgress.BatchBroadcastRequested',
    CcmBroadcastRequested: 'BitcoinIngressEgress.CcmBroadcastRequested',
    DepositFinalised: 'BitcoinIngressEgress.DepositFinalised',
    BoostPoolCreated: 'BitcoinIngressEgress.BoostPoolCreated',
    DepositBoosted: 'BitcoinIngressEgress.DepositBoosted',
    InsufficientBoostLiquidity: 'BitcoinIngressEgress.InsufficientBoostLiquidity',
    TransactionRejectedByBroker: 'BitcoinIngressEgress.TransactionRejectedByBroker',
    DepositFailed: 'BitcoinIngressEgress.DepositFailed',
  },
  EthereumIngressEgress: {
    BatchBroadcastRequested: 'EthereumIngressEgress.BatchBroadcastRequested',
    CcmBroadcastRequested: 'EthereumIngressEgress.CcmBroadcastRequested',
    DepositFinalised: 'EthereumIngressEgress.DepositFinalised',
    BoostPoolCreated: 'EthereumIngressEgress.BoostPoolCreated',
    DepositBoosted: 'EthereumIngressEgress.DepositBoosted',
    InsufficientBoostLiquidity: 'EthereumIngressEgress.InsufficientBoostLiquidity',
    TransactionRejectedByBroker: 'EthereumIngressEgress.TransactionRejectedByBroker',
    DepositFailed: 'EthereumIngressEgress.DepositFailed',
  },
  ArbitrumIngressEgress: {
    BatchBroadcastRequested: 'ArbitrumIngressEgress.BatchBroadcastRequested',
    CcmBroadcastRequested: 'ArbitrumIngressEgress.CcmBroadcastRequested',
    DepositFinalised: 'ArbitrumIngressEgress.DepositFinalised',
    BoostPoolCreated: 'ArbitrumIngressEgress.BoostPoolCreated',
    DepositBoosted: 'ArbitrumIngressEgress.DepositBoosted',
    InsufficientBoostLiquidity: 'ArbitrumIngressEgress.InsufficientBoostLiquidity',
    TransactionRejectedByBroker: 'ArbitrumIngressEgress.TransactionRejectedByBroker',
    DepositFailed: 'ArbitrumIngressEgress.DepositFailed',
  },
  PolkadotIngressEgress: {
    BatchBroadcastRequested: 'PolkadotIngressEgress.BatchBroadcastRequested',
    CcmBroadcastRequested: 'PolkadotIngressEgress.CcmBroadcastRequested',
    DepositFinalised: 'PolkadotIngressEgress.DepositFinalised',
    BoostPoolCreated: 'PolkadotIngressEgress.BoostPoolCreated',
    DepositBoosted: 'PolkadotIngressEgress.DepositBoosted',
    InsufficientBoostLiquidity: 'PolkadotIngressEgress.InsufficientBoostLiquidity',
    TransactionRejectedByBroker: 'PolkadotIngressEgress.TransactionRejectedByBroker',
    DepositFailed: 'PolkadotIngressEgress.DepositFailed',
  },
  SolanaIngressEgress: {
    BatchBroadcastRequested: 'SolanaIngressEgress.BatchBroadcastRequested',
    CcmBroadcastRequested: 'SolanaIngressEgress.CcmBroadcastRequested',
    DepositFinalised: 'SolanaIngressEgress.DepositFinalised',
    BoostPoolCreated: 'SolanaIngressEgress.BoostPoolCreated',
    DepositBoosted: 'SolanaIngressEgress.DepositBoosted',
    InsufficientBoostLiquidity: 'SolanaIngressEgress.InsufficientBoostLiquidity',
    TransactionRejectedByBroker: 'SolanaIngressEgress.TransactionRejectedByBroker',
    DepositFailed: 'SolanaIngressEgress.DepositFailed',
  },
  BitcoinBroadcaster: {
    BroadcastSuccess: 'BitcoinBroadcaster.BroadcastSuccess',
    BroadcastAborted: 'BitcoinBroadcaster.BroadcastAborted',
    ThresholdSignatureInvalid: 'BitcoinBroadcaster.ThresholdSignatureInvalid',
    TransactionBroadcastRequest: 'BitcoinBroadcaster.TransactionBroadcastRequest',
  },
  EthereumBroadcaster: {
    BroadcastSuccess: 'EthereumBroadcaster.BroadcastSuccess',
    BroadcastAborted: 'EthereumBroadcaster.BroadcastAborted',
    ThresholdSignatureInvalid: 'EthereumBroadcaster.ThresholdSignatureInvalid',
    TransactionBroadcastRequest: 'EthereumBroadcaster.TransactionBroadcastRequest',
  },
  ArbitrumBroadcaster: {
    BroadcastSuccess: 'ArbitrumBroadcaster.BroadcastSuccess',
    BroadcastAborted: 'ArbitrumBroadcaster.BroadcastAborted',
    ThresholdSignatureInvalid: 'ArbitrumBroadcaster.ThresholdSignatureInvalid',
    TransactionBroadcastRequest: 'ArbitrumBroadcaster.TransactionBroadcastRequest',
  },
  PolkadotBroadcaster: {
    BroadcastSuccess: 'PolkadotBroadcaster.BroadcastSuccess',
    BroadcastAborted: 'PolkadotBroadcaster.BroadcastAborted',
    ThresholdSignatureInvalid: 'PolkadotBroadcaster.ThresholdSignatureInvalid',
    TransactionBroadcastRequest: 'PolkadotBroadcaster.TransactionBroadcastRequest',
  },
  SolanaBroadcaster: {
    BroadcastSuccess: 'SolanaBroadcaster.BroadcastSuccess',
    BroadcastAborted: 'SolanaBroadcaster.BroadcastAborted',
    ThresholdSignatureInvalid: 'SolanaBroadcaster.ThresholdSignatureInvalid',
    TransactionBroadcastRequest: 'SolanaBroadcaster.TransactionBroadcastRequest',
  },
  BitcoinChainTracking: {
    ChainStateUpdated: 'BitcoinChainTracking.ChainStateUpdated',
  },
  EthereumChainTracking: {
    ChainStateUpdated: 'EthereumChainTracking.ChainStateUpdated',
  },
  ArbitrumChainTracking: {
    ChainStateUpdated: 'ArbitrumChainTracking.ChainStateUpdated',
  },
  PolkadotChainTracking: {
    ChainStateUpdated: 'PolkadotChainTracking.ChainStateUpdated',
  },
  SolanaChainTracking: {
    ChainStateUpdated: 'SolanaChainTracking.ChainStateUpdated',
  },
} as const;

export const swapEventNames = Object.values(events).flatMap((pallets) => Object.values(pallets));

export type EventHandlerArgs = {
  prisma: Prisma.TransactionClient;
  event: Pick<Event, 'args' | 'name' | 'indexInBlock' | 'callId' | 'extrinsicId'>;
  block: Pick<Block, 'height' | 'hash' | 'timestamp' | 'specId'>;
};

const handlers = [
  {
    spec: '1.0.0' as Semver,
    handlers: [
      { name: events.LiquidityPools.NewPoolCreated, handler: newPoolCreated },
      { name: events.LiquidityPools.PoolFeeSet, handler: poolFeeSet },
      ...Object.values(Chains).flatMap((chain) => [
        {
          name: events[`${chain}IngressEgress`].BatchBroadcastRequested,
          handler: batchBroadcastRequested,
        },
        {
          name: events[`${chain}IngressEgress`].CcmBroadcastRequested,
          handler: networkCcmBroadcastRequested,
        },
        {
          name: events[`${chain}Broadcaster`].BroadcastSuccess,
          handler: broadcastSuccess(chain),
        },
        {
          name: events[`${chain}Broadcaster`].BroadcastAborted,
          handler: broadcastAborted(chain),
        },
        {
          name: events[`${chain}Broadcaster`].TransactionBroadcastRequest,
          handler: transactionBroadcastRequest(chain),
        },
        {
          name: events[`${chain}ChainTracking`].ChainStateUpdated,
          handler: chainStateUpdated(chain),
        },
      ]),
    ],
  },
  {
    spec: '1.5.0' as Semver,
    handlers: [
      { name: events.Swapping.SwapRescheduled, handler: swapRescheduled },
      ...Object.values(Chains).flatMap((chain) => [
        {
          name: events[`${chain}IngressEgress`].BoostPoolCreated,
          handler: boostPoolCreated,
        },
        {
          name: events[`${chain}IngressEgress`].InsufficientBoostLiquidity,
          handler: insufficientBoostLiquidity(chain),
        },
      ]),
    ],
  },
  {
    spec: '1.7.0' as Semver,
    handlers: [
      { name: events.Swapping.SwapRequested, handler: swapRequested },
      { name: events.Swapping.SwapRequestCompleted, handler: swapRequestCompleted },
      { name: events.Swapping.RefundEgressIgnored, handler: refundEgressIgnored },
      { name: events.Swapping.RefundEgressScheduled, handler: refundEgressScheduled },
      { name: events.Swapping.SwapExecuted, handler: swapExecuted },
      { name: events.Swapping.SwapDepositAddressReady, handler: swapDepositAddressReady },
      { name: events.Swapping.SwapEgressIgnored, handler: swapEgressIgnored },
      { name: events.Swapping.SwapEgressScheduled, handler: swapEgressScheduled },
      { name: events.Swapping.SwapScheduled, handler: swapScheduled },
      {
        name: events.LiquidityProvider.LiquidityDepositAddressReady,
        handler: liquidityDepositAddressReady,
      },
      ...Object.values(Chains).flatMap((chain) => [
        {
          name: events[`${chain}IngressEgress`].DepositFinalised,
          handler: depositFinalised,
        },
        {
          name: events[`${chain}IngressEgress`].DepositBoosted,
          handler: depositBoosted,
        },
      ]),
      ...Object.values(Chains).flatMap((chain) => [
        {
          name: events[`${chain}IngressEgress`].TransactionRejectedByBroker,
          handler: transactionRejectedByBroker(chain),
        },
      ]),
    ],
  },
  {
    spec: '1.8.0' as Semver,
    handlers: [
      ...Object.values(Chains).flatMap((chain) => [
        {
          name: events[`${chain}IngressEgress`].DepositFailed,
          handler: networkDepositFailed(chain),
        },
        {
          name: events[`${chain}Broadcaster`].ThresholdSignatureInvalid,
          handler: thresholdSignatureInvalid(chain),
        },
      ]),
    ],
  },
  {
    spec: '1.9.0' as Semver,
    handlers: [
      {
        name: 'Swapping.CreditedOnChain',
        handler: creditedOnChain,
      },
      {
        name: 'Swapping.RefundedOnChain',
        handler: refundedOnChain,
      },
    ],
  },
];

export const handlerMap = HandlerMap.fromGroupedHandlers(handlers);
