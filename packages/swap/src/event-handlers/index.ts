import type { Prisma } from '.prisma/client';
import { Chains } from '@/shared/enums';
import type { Block, Event } from '../gql/generated/graphql';
import { buildHandlerMap, getDispatcher } from '../utils/handlers';
import networkBatchBroadcastRequested from './networkBatchBroadcastRequested';
import networkBroadcastAborted from './networkBroadcastAborted';
import networkBroadcastSuccess from './networkBroadcastSuccess';
import networkCcmBroadcastRequested from './networkCcmBroadcastRequested';
import networkEgressScheduled from './networkEgressScheduled';
import swapEgressScheduled from './swapEgressScheduled';
import swapExecuted from './swapExecuted';
import swapScheduled from './swapScheduled';

const events = {
  Swapping: {
    SwapScheduled: 'Swapping.SwapScheduled',
    SwapExecuted: 'Swapping.SwapExecuted',
    SwapEgressScheduled: 'Swapping.SwapEgressScheduled',
  },
  BitcoinIngressEgress: {
    EgressScheduled: 'BitcoinIngressEgress.EgressScheduled',
    BatchBroadcastRequested: 'BitcoinIngressEgress.BatchBroadcastRequested',
    CcmBroadcastRequested: 'BitcoinIngressEgress.CcmBroadcastRequested',
  },
  BitcoinBroadcaster: {
    BroadcastSuccess: 'BitcoinBroadcaster.BroadcastSuccess',
    BroadcastAborted: 'BitcoinBroadcaster.BroadcastAborted',
  },
  EthereumIngressEgress: {
    EgressScheduled: 'EthereumIngressEgress.EgressScheduled',
    BatchBroadcastRequested: 'EthereumIngressEgress.BatchBroadcastRequested',
    CcmBroadcastRequested: 'EthereumIngressEgress.CcmBroadcastRequested',
  },
  EthereumBroadcaster: {
    BroadcastSuccess: 'EthereumBroadcaster.BroadcastSuccess',
    BroadcastAborted: 'EthereumBroadcaster.BroadcastAborted',
  },
  PolkadotIngressEgress: {
    EgressScheduled: 'PolkadotIngressEgress.EgressScheduled',
    BatchBroadcastRequested: 'PolkadotIngressEgress.BatchBroadcastRequested',
    CcmBroadcastRequested: 'PolkadotIngressEgress.CcmBroadcastRequested',
  },
  PolkadotBroadcaster: {
    BroadcastSuccess: 'PolkadotBroadcaster.BroadcastSuccess',
    BroadcastAborted: 'PolkadotBroadcaster.BroadcastAborted',
  },
} as const;

export const swapEventNames = Object.values(events).flatMap((pallets) =>
  Object.values(pallets),
);

export type EventHandlerArgs = {
  prisma: Prisma.TransactionClient;
  event: Pick<Event, 'args' | 'name' | 'indexInBlock'>;
  block: Pick<Block, 'height' | 'timestamp'>;
};

const handlers = [
  {
    spec: 0,
    handlers: [
      { name: events.Swapping.SwapScheduled, handler: swapScheduled },
      { name: events.Swapping.SwapExecuted, handler: swapExecuted },
      {
        name: events.Swapping.SwapEgressScheduled,
        handler: swapEgressScheduled,
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
          name: events[`${chain}Broadcaster`].BroadcastSuccess,
          handler: networkBroadcastSuccess(chain),
        },
        {
          name: events[`${chain}Broadcaster`].BroadcastAborted,
          handler: networkBroadcastAborted(chain),
        },
      ]),
    ],
  },
];

const eventHandlerMap = buildHandlerMap(handlers);

export const getEventHandler = getDispatcher(eventHandlerMap);
