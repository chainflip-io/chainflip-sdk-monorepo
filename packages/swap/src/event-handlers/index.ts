import type { Prisma } from '.prisma/client';
import { Chains } from '@/shared/enums';
import ccmFailed from './ccmFailed';
import { depositBoosted } from './depositBoosted';
import liquidityDepositAddressReady from './liquidityDepositChannelReady';
import networkBatchBroadcastRequested from './networkBatchBroadcastRequested';
import networkBroadcastAborted from './networkBroadcastAborted';
import networkBroadcastSuccess from './networkBroadcastSuccess';
import networkCcmBroadcastRequested from './networkCcmBroadcastRequested';
import chainStateUpdated from './networkChainStateUpdated';
import { networkDepositFinalised } from './networkDepositFinalised';
import networkDepositIgnored from './networkDepositIgnored';
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
    CcmFailed: 'Swapping.CcmFailed',
  },
  BitcoinIngressEgress: {
    BatchBroadcastRequested: 'BitcoinIngressEgress.BatchBroadcastRequested',
    CcmBroadcastRequested: 'BitcoinIngressEgress.CcmBroadcastRequested',
    DepositFinalised: 'BitcoinIngressEgress.DepositFinalised',
    DepositIgnored: 'BitcoinIngressEgress.DepositIgnored',
    BoostPoolCreated: 'BitcoinIngressEgress.BoostPoolCreated',
    DepositBoosted: 'BitcoinIngressEgress.DepositBoosted',
    InsufficientBoostLiquidity: 'BitcoinIngressEgress.InsufficientBoostLiquidity',
    TransactionRejectedByBroker: 'BitcoinIngressEgress.TransactionRejectedByBroker',
  },
  EthereumIngressEgress: {
    BatchBroadcastRequested: 'EthereumIngressEgress.BatchBroadcastRequested',
    CcmBroadcastRequested: 'EthereumIngressEgress.CcmBroadcastRequested',
    DepositFinalised: 'EthereumIngressEgress.DepositFinalised',
    DepositIgnored: 'EthereumIngressEgress.DepositIgnored',
    BoostPoolCreated: 'EthereumIngressEgress.BoostPoolCreated',
    DepositBoosted: 'EthereumIngressEgress.DepositBoosted',
    InsufficientBoostLiquidity: 'EthereumIngressEgress.InsufficientBoostLiquidity',
    TransactionRejectedByBroker: 'EthereumIngressEgress.TransactionRejectedByBroker',
  },
  ArbitrumIngressEgress: {
    BatchBroadcastRequested: 'ArbitrumIngressEgress.BatchBroadcastRequested',
    CcmBroadcastRequested: 'ArbitrumIngressEgress.CcmBroadcastRequested',
    DepositFinalised: 'ArbitrumIngressEgress.DepositFinalised',
    DepositIgnored: 'ArbitrumIngressEgress.DepositIgnored',
    BoostPoolCreated: 'ArbitrumIngressEgress.BoostPoolCreated',
    DepositBoosted: 'ArbitrumIngressEgress.DepositBoosted',
    InsufficientBoostLiquidity: 'ArbitrumIngressEgress.InsufficientBoostLiquidity',
    TransactionRejectedByBroker: 'ArbitrumIngressEgress.TransactionRejectedByBroker',
  },
  PolkadotIngressEgress: {
    BatchBroadcastRequested: 'PolkadotIngressEgress.BatchBroadcastRequested',
    CcmBroadcastRequested: 'PolkadotIngressEgress.CcmBroadcastRequested',
    DepositFinalised: 'PolkadotIngressEgress.DepositFinalised',
    DepositIgnored: 'PolkadotIngressEgress.DepositIgnored',
    BoostPoolCreated: 'PolkadotIngressEgress.BoostPoolCreated',
    DepositBoosted: 'PolkadotIngressEgress.DepositBoosted',
    InsufficientBoostLiquidity: 'PolkadotIngressEgress.InsufficientBoostLiquidity',
    TransactionRejectedByBroker: 'PolkadotIngressEgress.TransactionRejectedByBroker',
  },
  SolanaIngressEgress: {
    BatchBroadcastRequested: 'SolanaIngressEgress.BatchBroadcastRequested',
    CcmBroadcastRequested: 'SolanaIngressEgress.CcmBroadcastRequested',
    DepositFinalised: 'SolanaIngressEgress.DepositFinalised',
    DepositIgnored: 'SolanaIngressEgress.DepositIgnored',
    BoostPoolCreated: 'SolanaIngressEgress.BoostPoolCreated',
    DepositBoosted: 'SolanaIngressEgress.DepositBoosted',
    InsufficientBoostLiquidity: 'SolanaIngressEgress.InsufficientBoostLiquidity',
    TransactionRejectedByBroker: 'SolanaIngressEgress.TransactionRejectedByBroker',
  },
  BitcoinBroadcaster: {
    BroadcastSuccess: 'BitcoinBroadcaster.BroadcastSuccess',
    BroadcastAborted: 'BitcoinBroadcaster.BroadcastAborted',
  },
  EthereumBroadcaster: {
    BroadcastSuccess: 'EthereumBroadcaster.BroadcastSuccess',
    BroadcastAborted: 'EthereumBroadcaster.BroadcastAborted',
  },
  ArbitrumBroadcaster: {
    BroadcastSuccess: 'ArbitrumBroadcaster.BroadcastSuccess',
    BroadcastAborted: 'ArbitrumBroadcaster.BroadcastAborted',
  },
  PolkadotBroadcaster: {
    BroadcastSuccess: 'PolkadotBroadcaster.BroadcastSuccess',
    BroadcastAborted: 'PolkadotBroadcaster.BroadcastAborted',
  },
  SolanaBroadcaster: {
    BroadcastSuccess: 'SolanaBroadcaster.BroadcastSuccess',
    BroadcastAborted: 'SolanaBroadcaster.BroadcastAborted',
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
  event: Pick<Event, 'args' | 'name' | 'indexInBlock' | 'callId'>;
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
        {
          name: events[`${chain}IngressEgress`].DepositIgnored,
          handler: networkDepositIgnored(chain),
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
      { name: events.Swapping.CcmFailed, handler: ccmFailed },
      {
        name: events.LiquidityProvider.LiquidityDepositAddressReady,
        handler: liquidityDepositAddressReady,
      },
      ...Object.values(Chains).flatMap((chain) => [
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
];

const eventHandlerMap = buildHandlerMap(handlers);

export const getEventHandler = getDispatcher(eventHandlerMap);
