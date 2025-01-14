import { GraphQLClient } from 'graphql-request';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import prisma from '@/swap/client';
import ccmFailed from '../ccmFailed';

vi.mock('graphql-request', () => ({
  GraphQLClient: class {
    request() {
      throw new Error('unmocked request');
    }
  },
}));

const vault = {
  name: 'Swapping.CcmFailed',
  args: {
    origin: {
      __kind: 'Vault',
      txHash: '0x704598f6707380f5a30059e56b0613140776173724fb54cdc6cafae5d1fe52a7',
    },
    reason: {
      __kind: 'InsufficientDepositAmount',
    },
    depositMetadata: {
      sourceChain: {
        __kind: 'Ethereum',
      },
      sourceAddress: {
        value: '0x67ff09c184d8e9e7b90c5187ed04cbfbdba741c8',
        __kind: 'Eth',
      },
      channelMetadata: {
        message: '0x776173737570',
        gasBudget: '10000000000',
        cfParameters: '0x',
      },
    },
    destinationAddress: {
      value: '0x61a0fcc7dd5e86b168216854c09f075994c53e8c',
      __kind: 'Arb',
    },
  },
  callId: '0001895970-000383-4ff4f',
  indexInBlock: 769,
  block: {
    height: 1895970,
    hash: '0x4ff4f02dfea8be1a2d1651e9ce332ed69fa23dc2a59c1ef920db99e8063405c3',
    timestamp: '2024-07-24T10:18:30+00:00',
    specId: 'chainflip-node@145',
  },
  call: {
    args: {
      call: {
        value: {
          __kind: 'ccm_deposit',
          txHash: '0x704598f6707380f5a30059e56b0613140776173724fb54cdc6cafae5d1fe52a7',
          sourceAsset: {
            __kind: 'Usdc',
          },
          depositAmount: '1000000',
          depositMetadata: {
            sourceChain: {
              __kind: 'Ethereum',
            },
            sourceAddress: {
              value: '0x67ff09c184d8e9e7b90c5187ed04cbfbdba741c8',
              __kind: 'Eth',
            },
            channelMetadata: {
              message: '0x776173737570',
              gasBudget: '10000000000',
              cfParameters: '0x',
            },
          },
          destinationAsset: {
            __kind: 'ArbUsdc',
          },
          destinationAddress: {
            value: '0x61a0fcc7dd5e86b168216854c09f075994c53e8c',
            __kind: 'Arb',
          },
        },
        __kind: 'Swapping',
      },
      epochIndex: 136,
    },
  },
} as const;

const depositChannel = {
  name: 'Swapping.CcmFailed',
  args: {
    origin: {
      __kind: 'DepositChannel',
      channelId: '6',
      depositAddress: {
        value: '0xf518267f8acb5c25ba4673de628604d3c4b294cf',
        __kind: 'Eth',
      },
      depositBlockHeight: '6402694',
    },
    reason: {
      __kind: 'InsufficientDepositAmount',
    },
    depositMetadata: {
      sourceChain: {
        __kind: 'Ethereum',
      },
      channelMetadata: {
        message: '0xdeadc0de',
        gasBudget: '72057594113783296',
        cfParameters: '0x',
      },
    },
    destinationAddress: {
      value: '0x5df6ac4b4e84d9af2867d994f54096982927f67a',
      __kind: 'Arb',
    },
  },
  callId: '0001980316-000417-fc8d5',
  indexInBlock: 838,
  block: {
    height: 1980316,
    hash: '0xfc8d570067ccaf4a9b7a16c65e5331726cdf7090dc9a6228969f84346b33812c',
    timestamp: '2024-07-30T08:57:30+00:00',
    specId: 'chainflip-node@145',
  },
  call: {
    args: {
      call: {
        value: {
          __kind: 'process_deposits',
          blockHeight: '6402694',
          depositWitnesses: [
            {
              asset: {
                __kind: 'Eth',
              },
              amount: '30000000000000000',
              depositAddress: '0xf518267f8acb5c25ba4673de628604d3c4b294cf',
            },
          ],
        },
        __kind: 'EthereumIngressEgress',
      },
      epochIndex: 142,
    },
  },
} as const;

describe(ccmFailed, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "FailedSwap", "SwapDepositChannel" CASCADE;`;
  });

  it.each([vault, depositChannel])('creates a failed swap', async ({ call, block, ...event }) => {
    vi.spyOn(GraphQLClient.prototype, 'request').mockResolvedValue({ call });

    if (event.args.origin.__kind === 'DepositChannel') {
      await prisma.swapDepositChannel.create({
        data: {
          issuedBlock: 6402693,
          depositAddress: event.args.origin.depositAddress.value,
          channelId: BigInt(event.args.origin.channelId),
          srcAsset: 'Eth',
          srcChain: 'Ethereum',
          destAsset: 'ArbUsdc',
          destAddress: '0x5df6ac4b4e84d9af2867d994f54096982927f67a',
          openingFeePaid: 0,
          totalBrokerCommissionBps: 0,
        },
      });
    }

    await ccmFailed({ prisma, event, block });

    expect(await prisma.failedSwap.findFirstOrThrow()).toMatchSnapshot({
      id: expect.any(Number),
      swapDepositChannelId:
        event.args.origin.__kind === 'DepositChannel' ? expect.any(BigInt) : null,
    });
  });
});
