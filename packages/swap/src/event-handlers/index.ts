import type { Prisma } from '.prisma/client';
import { HandlerMap } from '@chainflip/processor';
import type { Semver } from '@chainflip/processor/types';
import { ChainflipChain, chainflipChains } from '@chainflip/utils/chainflip';
import broadcastAborted from './broadcaster/broadcastAborted';
import broadcastSuccess from './broadcaster/broadcastSuccess';
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

// eslint-disable-next-line @typescript-eslint/no-shadow, @typescript-eslint/ban-types
type GenericPalletEventMap<Pallet extends string, Event extends string> = {} & {
  [C in ChainflipChain as `${C}${Pallet}`]: {
    [E in Event]: `${C}${Pallet}.${E}`;
  };
};

const genericPalletEvents = <const P extends string, const E extends string>(
  pallet: P,
  events: E[],
) =>
  Object.fromEntries(
    chainflipChains.map((c) => [
      [`${c}${pallet}`],
      Object.fromEntries(events.map((e) => [e, `${c}${pallet}.${e}`])),
    ]),
  ) as GenericPalletEventMap<P, E>;

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
  ...genericPalletEvents('IngressEgress', [
    'BatchBroadcastRequested',
    'CcmBroadcastRequested',
    'DepositFinalised',
    'BoostPoolCreated',
    'DepositBoosted',
    'InsufficientBoostLiquidity',
    'TransactionRejectedByBroker',
    'DepositFailed',
  ]),
  ...genericPalletEvents('Broadcaster', [
    'BroadcastSuccess',
    'BroadcastAborted',
    'TransactionBroadcastRequest',
  ]),
  ...genericPalletEvents('ChainTracking', ['ChainStateUpdated']),
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
      ...chainflipChains.flatMap((chain) => [
        {
          name: events[`${chain}IngressEgress`].BatchBroadcastRequested,
          handler: batchBroadcastRequested(chain),
        },
        {
          name: events[`${chain}IngressEgress`].CcmBroadcastRequested,
          handler: networkCcmBroadcastRequested(chain),
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
      ...chainflipChains.flatMap((chain) => [
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
      ...chainflipChains.flatMap((chain) => [
        {
          name: events[`${chain}IngressEgress`].DepositFinalised,
          handler: depositFinalised(chain),
        },
        {
          name: events[`${chain}IngressEgress`].DepositBoosted,
          handler: depositBoosted(chain),
        },
      ]),
      ...chainflipChains.flatMap((chain) => [
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
      ...chainflipChains.flatMap((chain) => [
        {
          name: events[`${chain}IngressEgress`].DepositFailed,
          handler: networkDepositFailed(chain),
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
