import { HandlerMap } from '@chainflip/processor';
import type { Semver } from '@chainflip/processor/types';
import { ChainflipChain, chainflipChains } from '@chainflip/utils/chainflip';
import type { Prisma } from '@prisma/swapping';
import broadcastAborted from './broadcaster/broadcastAborted.js';
import broadcastSuccess from './broadcaster/broadcastSuccess.js';
import transactionBroadcastRequest from './broadcaster/transactionBroadcastRequest.js';
import batchBroadcastRequested from './ingress-egress/batchBroadcastRequested.js';
import networkCcmBroadcastRequested from './ingress-egress/ccmBroadcastRequested.js';
import { depositBoosted } from './ingress-egress/depositBoosted.js';
import networkDepositFailed from './ingress-egress/depositFailed.js';
import { depositFinalised } from './ingress-egress/depositFinalised.js';
import { insufficientBoostLiquidity } from './ingress-egress/insufficientBoostLiquidity.js';
import transactionRejectedByBroker from './ingress-egress/transactionRejectedByBroker.js';
import transferFallbackRequested from './ingress-egress/transferFallbackRequested.js';
import { lendingPoolsBoostPoolCreated } from './lending-pools/boostPoolCreated.js';
import newPoolCreated from './liquidity-pools/newPoolCreated.js';
import poolFeeSet from './liquidity-pools/poolFeeSet.js';
import liquidityDepositAddressReady from './liquidity-provider/liquidityDepositAddressReady.js';
import accountCreationDepositAddressReady from './swapping/accountCreationDepositAddressReady.js';
import creditedOnChain from './swapping/creditedOnChain.js';
import refundedOnChain from './swapping/refundedOnChain.js';
import refundEgressIgnored from './swapping/refundEgressIgnored.js';
import refundEgressScheduled from './swapping/refundEgressScheduled.js';
import swapAborted from './swapping/swapAborted.js';
import swapDepositAddressReady from './swapping/swapDepositAddressReady.js';
import swapEgressIgnored from './swapping/swapEgressIgnored.js';
import swapEgressScheduled from './swapping/swapEgressScheduled.js';
import swapExecuted from './swapping/swapExecuted.js';
import swapRequestCompleted from './swapping/swapRequestCompleted.js';
import swapRequested from './swapping/swapRequested.js';
import swapRescheduled from './swapping/swapRescheduled.js';
import swapScheduled from './swapping/swapScheduled.js';
import chainStateUpdated from './tracking/chainStateUpdated.js';
import type { Block, Event } from '../gql/generated/graphql.js';

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
  LendingPools: {
    BoostPoolCreated: 'LendingPools.BoostPoolCreated',
  },
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
    SwapAborted: 'Swapping.SwapAborted',
    AccountCreationDepositAddressReady: 'Swapping.AccountCreationDepositAddressReady',
  },
  ...genericPalletEvents('IngressEgress', [
    'BatchBroadcastRequested',
    'CcmBroadcastRequested',
    'DepositFinalised',
    'DepositBoosted',
    'InsufficientBoostLiquidity',
    'TransactionRejectedByBroker',
    'DepositFailed',
    'TransferFallbackRequested',
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
  event: Pick<Event, 'args' | 'name' | 'indexInBlock'>;
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
    spec: '1.4.0' as Semver,
    handlers: [
      ...chainflipChains.flatMap((chain) => [
        {
          name: events[`${chain}IngressEgress`].InsufficientBoostLiquidity,
          handler: insufficientBoostLiquidity(chain),
        },
      ]),
    ],
  },
  {
    spec: '1.5.0' as Semver,
    handlers: [{ name: events.Swapping.SwapRescheduled, handler: swapRescheduled }],
  },
  {
    spec: '1.6.0' as Semver,
    handlers: [{ name: events.Swapping.SwapRequestCompleted, handler: swapRequestCompleted }],
  },
  {
    spec: '1.7.0' as Semver,
    handlers: [
      { name: events.Swapping.RefundEgressIgnored, handler: refundEgressIgnored },
      { name: events.Swapping.SwapExecuted, handler: swapExecuted },
      { name: events.Swapping.SwapDepositAddressReady, handler: swapDepositAddressReady },
      { name: events.Swapping.SwapEgressIgnored, handler: swapEgressIgnored },
      { name: events.Swapping.SwapEgressScheduled, handler: swapEgressScheduled },
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
      { name: events.Swapping.SwapScheduled, handler: swapScheduled },
      ...chainflipChains.flatMap((chain) => [
        {
          name: events[`${chain}IngressEgress`].TransferFallbackRequested,
          handler: transferFallbackRequested(chain),
        },
      ]),
    ],
  },
  {
    spec: '1.9.0' as Semver,
    handlers: [
      {
        name: events.Swapping.CreditedOnChain,
        handler: creditedOnChain,
      },
    ],
  },
  {
    spec: '1.10.0' as Semver,
    handlers: [
      { name: events.Swapping.SwapRequested, handler: swapRequested },
      { name: events.LendingPools.BoostPoolCreated, handler: lendingPoolsBoostPoolCreated },
      { name: events.Swapping.RefundEgressScheduled, handler: refundEgressScheduled },
      {
        name: events.Swapping.RefundedOnChain,
        handler: refundedOnChain,
      },
      ...chainflipChains.flatMap((chain) => [
        {
          name: events[`${chain}IngressEgress`].DepositFailed,
          handler: networkDepositFailed(chain),
        },
      ]),
    ],
  },
  {
    spec: '1.11.0' as Semver,
    handlers: [{ name: events.Swapping.SwapAborted, handler: swapAborted }],
  },
  {
    spec: '2.0.0' as Semver,
    handlers: [
      {
        // TODO: remove cast. it fixes an annoying type issue that we will have
        // to properly fix later
        name: events.Swapping.AccountCreationDepositAddressReady as string,
        handler: accountCreationDepositAddressReady,
      },
    ],
  },
];

export const handlerMap = HandlerMap.fromGroupedHandlers(handlers);
