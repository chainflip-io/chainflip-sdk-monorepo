import type { Prisma } from '.prisma/client';
import { Chains } from '@/shared/enums';
import { depositBoosted } from './depositBoosted';
import liquidityDepositAddressReady from './liquidityDepositChannelReady';
import networkBatchBroadcastRequested from './networkBatchBroadcastRequested';
import networkBroadcastAborted from './networkBroadcastAborted';
import networkBroadcastSuccess from './networkBroadcastSuccess';
import networkCcmBroadcastRequested from './networkCcmBroadcastRequested';
import networkCcmFailed from './networkCcmFailed';
import chainStateUpdated from './networkChainStateUpdated';
import networkDepositFailed from './networkDepositFailed';
import { networkDepositFinalised } from './networkDepositFinalised';
import networkThresholdSignatureInvalid from './networkThresholdSignatureInvalid';
import networkTransactionBroadcastRequest from './networkTransactionBroadcastRequest';
import networkTransactionRejectedByBroker from './networkTransactionRejectedByBroker';
import newPoolCreated from './newPoolCreated';
import poolFeeSet from './poolFeeSet';
import refundEgressIgnored from './refundEgressIgnored';
import refundEgressScheduled from './refundEgressScheduled';
import swapDepositAddressReady from './swapDepositAddressReady';
import swapEgressIgnored from './swapEgressIgnored';
import swapEgressScheduled from './swapEgressScheduled';
import swapExecuted from './swapExecuted';
import swapRequestCompleted from './swapRequestCompleted';
import swapRequested from './swapRequested';
import swapRescheduled from './swapRescheduled';
import swapScheduled from './swapScheduled';
import { boostPoolCreated } from './v140/boostPoolCreated';
import { insufficientBoostLiquidity } from './v140/insufficientBoostLiquidity';
import type { Block, Event } from '../gql/generated/graphql';
import { buildHandlerMap, getDispatcher } from '../utils/handlers';

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
  },
  BitcoinIngressEgress: {
    BatchBroadcastRequested: 'BitcoinIngressEgress.BatchBroadcastRequested',
    CcmBroadcastRequested: 'BitcoinIngressEgress.CcmBroadcastRequested',
    DepositFinalised: 'BitcoinIngressEgress.DepositFinalised',
    BoostPoolCreated: 'BitcoinIngressEgress.BoostPoolCreated',
    DepositBoosted: 'BitcoinIngressEgress.DepositBoosted',
    InsufficientBoostLiquidity: 'BitcoinIngressEgress.InsufficientBoostLiquidity',
    TransactionRejectedByBroker: 'BitcoinIngressEgress.TransactionRejectedByBroker',
    CcmFailed: 'BitcoinIngressEgress.CcmFailed',
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
    CcmFailed: 'EthereumIngressEgress.CcmFailed',
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
    CcmFailed: 'ArbitrumIngressEgress.CcmFailed',
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
    CcmFailed: 'PolkadotIngressEgress.CcmFailed',
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
    CcmFailed: 'SolanaIngressEgress.CcmFailed',
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
    spec: 0,
    handlers: [
      { name: events.LiquidityPools.NewPoolCreated, handler: newPoolCreated },
      { name: events.LiquidityPools.PoolFeeSet, handler: poolFeeSet },
      ...Object.values(Chains).flatMap((chain) => [
        {
          name: events[`${chain}IngressEgress`].BatchBroadcastRequested,
          handler: networkBatchBroadcastRequested,
        },
        {
          name: events[`${chain}IngressEgress`].CcmBroadcastRequested,
          handler: networkCcmBroadcastRequested,
        },
        {
          name: events[`${chain}Broadcaster`].BroadcastSuccess,
          handler: networkBroadcastSuccess(chain),
        },
        {
          name: events[`${chain}Broadcaster`].BroadcastAborted,
          handler: networkBroadcastAborted(chain),
        },
        {
          name: events[`${chain}Broadcaster`].TransactionBroadcastRequest,
          handler: networkTransactionBroadcastRequest(chain),
        },
        {
          name: events[`${chain}ChainTracking`].ChainStateUpdated,
          handler: chainStateUpdated(chain),
        },
      ]),
    ],
  },
  {
    spec: 150,
    handlers: [
      { name: events.Swapping.SwapRescheduled, handler: swapRescheduled },
      ...Object.values(Chains).flatMap((chain) => [
        {
          name: events[`${chain}IngressEgress`].BoostPoolCreated,
          handler: boostPoolCreated,
        },
        {
          name: events[`${chain}IngressEgress`].InsufficientBoostLiquidity,
          handler: insufficientBoostLiquidity,
        },
      ]),
    ],
  },
  {
    spec: 170,
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
          name: events[`${chain}IngressEgress`].CcmFailed,
          handler: networkCcmFailed,
        },
        {
          name: events[`${chain}IngressEgress`].DepositFinalised,
          handler: networkDepositFinalised,
        },
        {
          name: events[`${chain}IngressEgress`].DepositBoosted,
          handler: depositBoosted,
        },
      ]),
      ...Object.values(Chains).flatMap((chain) => [
        {
          name: events[`${chain}IngressEgress`].TransactionRejectedByBroker,
          handler: networkTransactionRejectedByBroker(chain),
        },
      ]),
    ],
  },
  {
    spec: 180,
    handlers: [
      ...Object.values(Chains).flatMap((chain) => [
        {
          name: events[`${chain}IngressEgress`].DepositFailed,
          handler: networkDepositFailed(chain),
        },
        {
          name: events[`${chain}Broadcaster`].ThresholdSignatureInvalid,
          handler: networkThresholdSignatureInvalid(chain),
        },
      ]),
    ],
  },
];

const eventHandlerMap = buildHandlerMap(handlers);

export const getEventHandler = getDispatcher(eventHandlerMap);
