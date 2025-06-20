import { swappingSwapRequested as schema11000 } from '@chainflip/processor/11000/swapping/swapRequested';
import { swappingSwapRequested as schema190 } from '@chainflip/processor/190/swapping/swapRequested';
import * as base58 from '@chainflip/utils/base58';
import { bytesToHex } from '@chainflip/utils/bytes';
import { assetConstants } from '@chainflip/utils/chainflip';
import * as ss58 from '@chainflip/utils/ss58';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import prisma from '../../../client.js';
import { check } from '../../__tests__/utils.js';
import swapRequested, { SwapRequestedArgs11000, SwapRequestedArgs190 } from '../swapRequested.js';

const accountId = 'cFNzKSS48cZ1xQmdub2ykc2LUc5UZS2YjLaZBUvmxoXHjMMVh';

const vaultBitcoin190 = {
  origin: {
    txId: {
      value: '0xad7aa682145c044e7f0920eebbcccaa527657f3f7dad6300ad6043efcb9a1e2f',
      __kind: 'Bitcoin',
    },
    __kind: 'Vault',
    brokerId: '0x9059e6d854b769a505d01148af212bf8cb7f8469a7153edce8dcaedd9d299125',
  },
  brokerFees: [
    {
      bps: 100,
      account: '0x9059e6d854b769a505d01148af212bf8cb7f8469a7153edce8dcaedd9d299125',
    },
    {
      bps: 150,
      account: '0xa27ef1c721066568cc4d3483f680fbad02e0b999ace3347393bd7ab82bef4f2e',
    },
  ],
  inputAsset: { __kind: 'Btc' },
  inputAmount: '10000000',
  outputAsset: { __kind: 'Flip' },
  requestType: {
    __kind: 'Regular',
    outputAction: {
      __kind: 'Egress',
      outputAddress: { value: '0xb2806f8993e01460bc2f6e50fab466b5525dbe3a', __kind: 'Eth' },
    },
  },
  dcaParameters: { chunkInterval: 2, numberOfChunks: 1 },
  swapRequestId: '1',
  refundParameters: {
    minPrice: '326183663919595400739649677085384465302843',
    refundDestination: {
      __kind: 'ExternalAddress',
      value: {
        value: '0x6d76426367686f7345506973675338336963696e6a48696735346250635058457761',
        __kind: 'Btc',
      },
    },
    retryDuration: 150,
  },
} as const satisfies SwapRequestedArgs190;

const vaultSolana190 = {
  origin: {
    txId: {
      value: ['0xf5fa1e491da884a02d57d62323ea5a9754cf2cca03cb4064bf44016c7c3bc99b', '413006'],
      __kind: 'Solana',
    },
    __kind: 'Vault',
    brokerId: '0x9059e6d854b769a505d01148af212bf8cb7f8469a7153edce8dcaedd9d299125',
  },
  brokerFees: [
    {
      bps: 0,
      account: '0x9059e6d854b769a505d01148af212bf8cb7f8469a7153edce8dcaedd9d299125',
    },
  ],
  inputAsset: {
    __kind: 'Sol',
  },
  inputAmount: '100000000000',
  outputAsset: {
    __kind: 'Eth',
  },
  requestType: {
    __kind: 'Regular',
    outputAction: {
      __kind: 'Egress',
      outputAddress: {
        value: '0xf4640a7c3c20969f40c7e2b62d8a5e4f19e6c106',
        __kind: 'Eth',
      },
    },
  },
  swapRequestId: '158',
  refundParameters: {
    minPrice: '20330053335568424557569281615685057460598557419',
    refundDestination: {
      __kind: 'ExternalAddress',
      value: {
        value: '0xf79d5e026f12edc6443a534b2cdd5072233989b415d7596573e743f3e5b386fb',
        __kind: 'Sol',
      },
    },
    retryDuration: 10,
  },
} as const satisfies SwapRequestedArgs190;

const depositChannel190 = {
  origin: {
    __kind: 'DepositChannel',
    channelId: '6',
    depositAddress: {
      value:
        '0x626372743170676a326e327071616b6c7a726466613377796d716d646e3235336d3368346c787366756d616a366136683767756d656474763573637665783266',
      __kind: 'Btc',
    },
    depositBlockHeight: '167',
    brokerId: '0x9059e6d854b769a505d01148af212bf8cb7f8469a7153edce8dcaedd9d299125',
  },
  brokerFees: [],
  inputAsset: { __kind: 'Btc' },
  inputAmount: '4999922',
  outputAsset: { __kind: 'Eth' },
  requestType: {
    __kind: 'Regular',
    outputAction: {
      __kind: 'Egress',
      outputAddress: { value: '0xa51c1fc2f0d1a1b8494ed1fe312d7c3a78ed91c0', __kind: 'Eth' },
      ccmDepositMetadata: {
        sourceChain: { __kind: 'Bitcoin' },
        channelMetadata: {
          message:
            '0x0000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000003f7a400000000000000000000000000000000000000000000000000000000000000074761735465737400000000000000000000000000000000000000000000000000',
          gasBudget: '2',
          ccmAdditionalData:
            '0x7ae79240f09d236433572d970077360c2fb1af40f30a2463907f39ff189c49e602c459e18eb2391a1bf0ddc69201fce27ddd0f0f11c2f2b6e1b041c1300667d9fe583721a4b4aad88885a0f2881db68f6a12e385ad1b9ca3',
        },
      },
    },
  },
  dcaParameters: {
    numberOfChunks: 10,
    chunkInterval: 2,
  },
  swapRequestId: '2',
} as const satisfies SwapRequestedArgs190;

const solDepositChannel190 = {
  origin: {
    __kind: 'DepositChannel',
    brokerId: '0x9059e6d854b769a505d01148af212bf8cb7f8469a7153edce8dcaedd9d299125',
    channelId: '11',
    depositAddress: {
      value: '0xe59df1dc66dfb4b54d8eee93b6f9608789c251f3d773ad868fb90834b2b74f41',
      __kind: 'Sol',
    },
    depositBlockHeight: '3165343',
  },
  brokerFees: [
    { bps: 100, account: '0x9059e6d854b769a505d01148af212bf8cb7f8469a7153edce8dcaedd9d299125' },
  ],
  inputAsset: { __kind: 'Sol' },
  inputAmount: '99999994999',
  outputAsset: { __kind: 'Dot' },
  requestType: {
    __kind: 'Regular',
    outputAction: {
      __kind: 'Egress',
      outputAddress: {
        value: '0x02581a69b66b34f0d684f2249f7f45a4ef2c9d2f61c4fb82ed95c37e07850675',
        __kind: 'Dot',
      },
    },
  },
  swapRequestId: '92',
} as const satisfies SwapRequestedArgs190;

const onChain190 = {
  origin: {
    __kind: 'OnChainAccount',
    value: bytesToHex(ss58.decode(accountId).data),
  },
  brokerFees: [
    { bps: 100, account: '0x9059e6d854b769a505d01148af212bf8cb7f8469a7153edce8dcaedd9d299125' },
  ],
  inputAsset: { __kind: 'Sol' },
  inputAmount: '99999994999',
  outputAsset: { __kind: 'Dot' },
  requestType: {
    __kind: 'Regular',
    outputAction: {
      __kind: 'CreditOnChain',
      accountId: bytesToHex(ss58.decode(accountId).data),
    },
  },
  swapRequestId: '92',
  refundParameters: {
    refundDestination: {
      __kind: 'InternalAccount',
      value: bytesToHex(ss58.decode(accountId).data),
    },
    minPrice: '99999994999',
    retryDuration: 100,
  },
  dcaParameters: {
    numberOfChunks: 10,
    chunkInterval: 2,
  },
} as const satisfies SwapRequestedArgs190;

const ingressEgressFee = {
  origin: { __kind: 'Internal' },
  brokerFees: [],
  inputAsset: { __kind: 'Usdc' },
  inputAmount: '209443',
  outputAsset: { __kind: 'Eth' },
  requestType: { __kind: 'IngressEgressFee' },
  swapRequestId: '388319',
};

const networkFee = {
  origin: { __kind: 'Internal' },
  brokerFees: [],
  inputAsset: { __kind: 'Usdc' },
  inputAmount: '209',
  outputAsset: { __kind: 'Flip' },
  requestType: { __kind: 'NetworkFee' },
  swapRequestId: '388320',
};

const block = {
  id: '0000000087-3abaf',
  height: 87,
  hash: '0x3abafb8e450a28243fee4c0bf9a9fd14cfcbaab65854373b1f417aa4d79444aa',
  parent_hash: '0xf8e736eaf02c89d00a3e9fc3d68f71eb8e2e55cbc2bb26bc907dbf70c04c78e3',
  state_root: '0x652afd8fd12095990797f69a0833888a4d456dfabe97a43700f320978baa58d6',
  extrinsics_root: '0xa2f235aa78fdcc6393f63e0a661265a90a2e5d416b00b53280ea931f08209f8d',
  timestamp: '2024-08-23 13:13:12.002+00',
  validator: '0x36c0078af3894b8202b541ece6c5d8fb4a091f7e5812b688e703549040473911',
  specId: 'chainflip-node@160',
};

const event = {
  id: '0000000087-000013-3abaf',
  blockId: '0000000087-3abaf',
  indexInBlock: 13,
  phase: 'ApplyExtrinsic',
  extrinsicId: '0000000087-000003-3abaf',
  callId: '0000000087-000003-3abaf',
  name: 'Swapping.SwapRequested',
  pos: 19,
};

vi.mock('@chainflip/solana');

describe(swapRequested, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "SwapRequest", "SwapDepositChannel", private."SolanaPendingTxRef" CASCADE;`;
  });

  it('creates a new swap request (DEPOSIT_CHANNEL 190)', async () => {
    const channel = await prisma.swapDepositChannel.create({
      data: {
        srcChain: assetConstants[depositChannel190.inputAsset.__kind].chain,
        depositAddress: Buffer.from(
          depositChannel190.origin.depositAddress.value.slice(2),
          'hex',
        ).toString(),
        issuedBlock: 1,
        channelId: BigInt(depositChannel190.origin.channelId),
        isExpired: false,
        srcAsset: depositChannel190.inputAsset.__kind,
        destAsset: depositChannel190.outputAsset.__kind,
        destAddress: depositChannel190.requestType.outputAction.outputAddress.value,
        totalBrokerCommissionBps: 0,
        openingFeePaid: 0,
      },
    });

    await swapRequested({ prisma, event: { ...event, args: depositChannel190 }, block });

    const request = await prisma.swapRequest.findFirstOrThrow();

    expect(request.swapDepositChannelId).toBe(channel.id);
    expect(request).toMatchSnapshot({
      id: expect.any(BigInt),
      swapDepositChannelId: expect.any(BigInt),
    });
  });

  it('creates a new swap request (VAULT 190)', async () => {
    await swapRequested({ prisma, event: { ...event, args: vaultBitcoin190 }, block });

    const request = await prisma.swapRequest.findFirstOrThrow({ include: { beneficiaries: true } });

    expect(request).toMatchSnapshot({
      id: expect.any(BigInt),
      beneficiaries: [
        { id: expect.any(BigInt), swapRequestId: expect.any(BigInt) },
        { id: expect.any(BigInt), swapRequestId: expect.any(BigInt) },
      ],
    });
  });

  it('creates a new swap request (ON_CHAIN 190)', async () => {
    await swapRequested({ prisma, event: { ...event, args: onChain190 }, block });

    const request = await prisma.swapRequest.findFirstOrThrow({
      include: { onChainSwapInfo: true },
    });

    expect(request).toMatchSnapshot({
      id: expect.any(BigInt),
      onChainSwapInfo: {
        id: expect.any(Number),
        swapRequestId: expect.any(BigInt),
      },
    });
  });

  it('handles network fees', async () => {
    await swapRequested({ prisma, event: { ...event, args: networkFee }, block });

    const request = await prisma.swapRequest.findFirstOrThrow({
      include: { onChainSwapInfo: true },
    });

    expect(request).toMatchSnapshot({
      id: expect.any(BigInt),
    });
  });

  it('handles ingress/egress fees', async () => {
    await swapRequested({ prisma, event: { ...event, args: ingressEgressFee }, block });

    const request = await prisma.swapRequest.findFirstOrThrow({
      include: { onChainSwapInfo: true },
    });

    expect(request).toMatchSnapshot({
      id: expect.any(BigInt),
    });
  });

  it('creates a new vault swap request and creates a pending tx ref record', async () => {
    await swapRequested({ prisma, event: { ...event, args: vaultSolana190 }, block });

    const request = await prisma.swapRequest.findFirstOrThrow({
      include: { solanaPendingTxRef: true },
    });
    expect(request.solanaPendingTxRef).toMatchSnapshot([
      {
        id: expect.any(Number),
        vaultSwapRequestId: expect.any(BigInt),
      },
    ]);
  });

  it('creates a new deposit channel swap request and creates a pending tx ref record', async () => {
    const channel = await prisma.swapDepositChannel.create({
      data: {
        srcChain: assetConstants[solDepositChannel190.inputAsset.__kind].chain,
        depositAddress: base58.encode(solDepositChannel190.origin.depositAddress.value),
        issuedBlock: 1,
        channelId: BigInt(solDepositChannel190.origin.channelId),
        isExpired: false,
        srcAsset: solDepositChannel190.inputAsset.__kind,
        destAsset: solDepositChannel190.outputAsset.__kind,
        destAddress: solDepositChannel190.requestType.outputAction.outputAddress.value,
        totalBrokerCommissionBps: 0,
        openingFeePaid: 0,
      },
    });

    await swapRequested({ prisma, event: { ...event, args: solDepositChannel190 }, block });

    const solanaPendingTxRef = await prisma.solanaPendingTxRef.findFirstOrThrow({
      where: { swapDepositChannelId: channel.id },
    });
    expect(solanaPendingTxRef).toMatchSnapshot({
      id: expect.any(Number),
      swapDepositChannelId: expect.any(BigInt),
    });
  });

  it('parses 1.10 event correctly', async () => {
    const swapRequestedEvent = check<SwapRequestedArgs11000>({
      origin: {
        txId: {
          value: '0xcce559ffce1b15f1a1e8880616990aaff7aca23d2bf51e9a362f00e07fd94c71',
          __kind: 'Evm',
        },
        __kind: 'Vault',
        brokerId: '0x9059e6d854b769a505d01148af212bf8cb7f8469a7153edce8dcaedd9d299125',
      },
      brokerFees: [
        {
          bps: 1,
          account: '0x9059e6d854b769a505d01148af212bf8cb7f8469a7153edce8dcaedd9d299125',
        },
      ],
      inputAsset: {
        __kind: 'Usdc',
      },
      inputAmount: '500000000',
      outputAsset: {
        __kind: 'Sol',
      },
      requestType: {
        __kind: 'Regular',
        outputAction: {
          __kind: 'Egress',
          outputAddress: {
            value: '0xa51c1fc2f0d1a1b8494ed1fe312d7c3a78ed91c0',
            __kind: 'Eth',
          },
          ccmDepositMetadata: {
            sourceChain: {
              __kind: 'Ethereum',
            },
            sourceAddress: {
              value: '0xf2be49c0ae121b6199ddde819d9649c55448e7a2',
              __kind: 'Eth',
            },
            channelMetadata: {
              message: '0xc9b0',
              gasBudget: '2589449',
              ccmAdditionalData: {
                __kind: 'Solana',
                value: {
                  __kind: 'V1',
                  ccmAccounts: {
                    cfReceiver: {
                      pubkey: '0x0000000000000000000000000000000000000000',
                      isWritable: false,
                    },
                    additionalAccounts: [],
                    fallbackAddress: '0x0000000000000000000000000000000000000000',
                  },
                  alts: ['0x0000000000000000000000000000000000000000'],
                },
              },
            },
          },
        },
      },
      swapRequestId: '538',
      refundParameters: {
        minPrice: '0',
        refundDestination: {
          __kind: 'ExternalAddress',
          value: { value: '0x0f5d2c0695a5bf55ec6fb564ef367735029db563', __kind: 'Eth' },
        },
        retryDuration: 0,
      },
    });

    expect(schema11000.safeParse(swapRequestedEvent)).toBeTruthy();
    expect(() => schema190.parse(swapRequestedEvent)).toThrow();
  });
});
