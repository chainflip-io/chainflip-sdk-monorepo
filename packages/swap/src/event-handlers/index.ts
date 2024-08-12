import type { Prisma } from '.prisma/client';
import { Chains } from '@/shared/enums';
import ccmDepositReceived from './ccmDepositReceived';
import depositIgnored from './depositIgnored';
import depositIgnoredV120 from './depositIgnoredV120';
import liquidityDepositAddressReady from './liquidityDepositChannelReady';
import networkBatchBroadcastRequested from './networkBatchBroadcastRequested';
import networkBroadcastAborted from './networkBroadcastAborted';
import networkBroadcastSuccess from './networkBroadcastSuccess';
import networkCcmBroadcastRequested from './networkCcmBroadcastRequested';
import chainStateUpdated from './networkChainStateUpdated';
import { networkDepositReceived } from './networkDepositReceived';
import networkEgressScheduled from './networkEgressScheduled';
import newPoolCreated from './newPoolCreated';
import poolFeeSet from './poolFeeSet';
import refundEgressIgnored from './refundEgressIgnored';
import refundEgressScheduled from './refundEgressScheduled';
import swapAmountTooLow from './swapAmountTooLow';
import swapDepositAddressReady from './swapDepositAddressReady';
import swapEgressIgnored from './swapEgressIgnored';
import swapEgressScheduled from './swapEgressScheduled';
import swapExecuted from './swapExecuted';
import swapRescheduled from './swapRescheduled';
import swapScheduled from './swapScheduled';
import { networkDepositReceived as networkDepositReceivedV120 } from './v120/networkDepositReceived';
import { boostPoolCreated } from './v140/boostPoolCreated';
import { depositBoosted } from './v140/depositBoosted';
import { depositFinalised } from './v140/depositFinalised';
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
    SwapAmountTooLow: 'Swapping.SwapAmountTooLow',
    SwapDepositAddressReady: 'Swapping.SwapDepositAddressReady',
    CcmDepositReceived: 'Swapping.CcmDepositReceived',
  },
  BitcoinIngressEgress: {
    EgressScheduled: 'BitcoinIngressEgress.EgressScheduled',
    BatchBroadcastRequested: 'BitcoinIngressEgress.BatchBroadcastRequested',
    CcmBroadcastRequested: 'BitcoinIngressEgress.CcmBroadcastRequested',
    DepositReceived: 'BitcoinIngressEgress.DepositReceived', // Renamed to DepositFinalised since spec 140
    DepositFinalised: 'BitcoinIngressEgress.DepositFinalised',
    DepositIgnored: 'BitcoinIngressEgress.DepositIgnored',
    BoostPoolCreated: 'BitcoinIngressEgress.BoostPoolCreated',
    DepositBoosted: 'BitcoinIngressEgress.DepositBoosted',
    InsufficientBoostLiquidity: 'BitcoinIngressEgress.InsufficientBoostLiquidity',
  },
  BitcoinBroadcaster: {
    BroadcastSuccess: 'BitcoinBroadcaster.BroadcastSuccess',
    BroadcastAborted: 'BitcoinBroadcaster.BroadcastAborted',
  },
  EthereumIngressEgress: {
    EgressScheduled: 'EthereumIngressEgress.EgressScheduled',
    BatchBroadcastRequested: 'EthereumIngressEgress.BatchBroadcastRequested',
    CcmBroadcastRequested: 'EthereumIngressEgress.CcmBroadcastRequested',
    DepositReceived: 'EthereumIngressEgress.DepositReceived', // Renamed to DepositFinalised since spec 140
    DepositFinalised: 'EthereumIngressEgress.DepositFinalised',
    DepositIgnored: 'EthereumIngressEgress.DepositIgnored',
    BoostPoolCreated: 'EthereumIngressEgress.BoostPoolCreated',
    DepositBoosted: 'EthereumIngressEgress.DepositBoosted',
    InsufficientBoostLiquidity: 'EthereumIngressEgress.InsufficientBoostLiquidity',
  },
  ArbitrumIngressEgress: {
    EgressScheduled: 'ArbitrumIngressEgress.EgressScheduled',
    BatchBroadcastRequested: 'ArbitrumIngressEgress.BatchBroadcastRequested',
    CcmBroadcastRequested: 'ArbitrumIngressEgress.CcmBroadcastRequested',
    DepositReceived: 'ArbitrumIngressEgress.DepositReceived', // Renamed to DepositFinalised since spec 140
    DepositFinalised: 'ArbitrumIngressEgress.DepositFinalised',
    DepositIgnored: 'ArbitrumIngressEgress.DepositIgnored',
    BoostPoolCreated: 'ArbitrumIngressEgress.BoostPoolCreated',
    DepositBoosted: 'ArbitrumIngressEgress.DepositBoosted',
    InsufficientBoostLiquidity: 'ArbitrumIngressEgress.InsufficientBoostLiquidity',
  },
  EthereumBroadcaster: {
    BroadcastSuccess: 'EthereumBroadcaster.BroadcastSuccess',
    BroadcastAborted: 'EthereumBroadcaster.BroadcastAborted',
  },
  ArbitrumBroadcaster: {
    BroadcastSuccess: 'ArbitrumBroadcaster.BroadcastSuccess',
    BroadcastAborted: 'ArbitrumBroadcaster.BroadcastAborted',
  },
  PolkadotIngressEgress: {
    EgressScheduled: 'PolkadotIngressEgress.EgressScheduled',
    BatchBroadcastRequested: 'PolkadotIngressEgress.BatchBroadcastRequested',
    CcmBroadcastRequested: 'PolkadotIngressEgress.CcmBroadcastRequested',
    DepositReceived: 'PolkadotIngressEgress.DepositReceived', // Renamed to DepositFinalised since spec 140
    DepositFinalised: 'PolkadotIngressEgress.DepositFinalised',
    DepositIgnored: 'PolkadotIngressEgress.DepositIgnored',
    BoostPoolCreated: 'PolkadotIngressEgress.BoostPoolCreated',
    DepositBoosted: 'PolkadotIngressEgress.DepositBoosted',
    InsufficientBoostLiquidity: 'PolkadotIngressEgress.InsufficientBoostLiquidity',
  },
  PolkadotBroadcaster: {
    BroadcastSuccess: 'PolkadotBroadcaster.BroadcastSuccess',
    BroadcastAborted: 'PolkadotBroadcaster.BroadcastAborted',
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
} as const;

export const swapEventNames = Object.values(events).flatMap((pallets) => Object.values(pallets));

export type EventHandlerArgs = {
  prisma: Prisma.TransactionClient;
  event: Pick<Event, 'args' | 'name' | 'indexInBlock'>;
  block: Pick<Block, 'height' | 'hash' | 'timestamp' | 'specId'>;
};

const handlers = [
  {
    spec: 0,
    handlers: [
      { name: events.LiquidityPools.NewPoolCreated, handler: newPoolCreated },
      { name: events.LiquidityPools.PoolFeeSet, handler: poolFeeSet },
      { name: events.Swapping.SwapScheduled, handler: swapScheduled },
      { name: events.Swapping.SwapRescheduled, handler: swapRescheduled },
      { name: events.Swapping.SwapExecuted, handler: swapExecuted },
      { name: events.Swapping.SwapAmountTooLow, handler: swapAmountTooLow },
      {
        name: events.Swapping.CcmDepositReceived,
        handler: ccmDepositReceived,
      },
      {
        name: events.Swapping.SwapDepositAddressReady,
        handler: swapDepositAddressReady,
      },
      {
        name: events.Swapping.SwapEgressScheduled,
        handler: swapEgressScheduled,
      },
      {
        name: events.Swapping.RefundEgressScheduled,
        handler: refundEgressScheduled,
      },
      {
        name: events.LiquidityProvider.LiquidityDepositAddressReady,
        handler: liquidityDepositAddressReady,
      },
      ...Object.values(Chains).flatMap((chain) => [
        {
          name: events[`${chain}IngressEgress`].EgressScheduled,
          handler: networkEgressScheduled,
        },
        {
          name: events[`${chain}IngressEgress`].BatchBroadcastRequested,
          handler: networkBatchBroadcastRequested,
        },
        {
          name: events[`${chain}IngressEgress`].CcmBroadcastRequested,
          handler: networkCcmBroadcastRequested,
        },
        {
          name: events[`${chain}IngressEgress`].DepositReceived,
          handler: networkDepositReceived(chain),
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
    spec: 114,
    handlers: Object.values(Chains).flatMap((chain) => [
      {
        name: events[`${chain}IngressEgress`].DepositIgnored,
        handler: depositIgnored(chain),
      },
    ]),
  },
  {
    spec: 120,
    handlers: [
      {
        name: events.Swapping.SwapEgressIgnored,
        handler: swapEgressIgnored,
      },
      ...Object.values(Chains).flatMap((chain) => [
        {
          name: events[`${chain}IngressEgress`].DepositIgnored,
          handler: depositIgnoredV120(chain),
        },
        {
          name: events[`${chain}IngressEgress`].DepositReceived,
          handler: networkDepositReceivedV120,
        },
      ]),
    ],
  },
  {
    spec: 140,
    handlers: Object.values(Chains).flatMap((chain) => [
      {
        name: events[`${chain}IngressEgress`].DepositFinalised,
        handler: depositFinalised,
      },
      {
        name: events[`${chain}IngressEgress`].BoostPoolCreated,
        handler: boostPoolCreated,
      },
      {
        name: events[`${chain}IngressEgress`].DepositBoosted,
        handler: depositBoosted,
      },

      {
        name: events[`${chain}IngressEgress`].InsufficientBoostLiquidity,
        handler: insufficientBoostLiquidity,
      },
    ]),
  },
  {
    spec: 150,
    handlers: [
      {
        name: events.Swapping.RefundEgressIgnored,
        handler: refundEgressIgnored,
      },
    ],
  },
];

const eventHandlerMap = buildHandlerMap(handlers);

export const getEventHandler = getDispatcher(eventHandlerMap);
