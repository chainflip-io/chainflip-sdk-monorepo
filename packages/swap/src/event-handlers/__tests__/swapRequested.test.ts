import { findSolanaDepositSignature } from '@chainflip/solana';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { assetConstants } from '@/shared/enums';
import prisma from '../../client';
import swapRequested from '../swapRequested';

const vaultBitcoin180 = {
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
    outputAddress: { value: '0xb2806f8993e01460bc2f6e50fab466b5525dbe3a', __kind: 'Eth' },
  },
  dcaParameters: { chunkInterval: 2, numberOfChunks: 1 },
  swapRequestId: '1',
  refundParameters: {
    minPrice: '326183663919595400739649677085384465302843',
    refundAddress: {
      value: '0x6d76426367686f7345506973675338336963696e6a48696735346250635058457761',
      __kind: 'Btc',
    },
    retryDuration: 150,
  },
} as const;

const vaultSolana180 = {
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
    outputAddress: {
      value: '0xf4640a7c3c20969f40c7e2b62d8a5e4f19e6c106',
      __kind: 'Eth',
    },
  },
  swapRequestId: '158',
  refundParameters: {
    minPrice: '20330053335568424557569281615685057460598557419',
    refundAddress: {
      value: '0xf79d5e026f12edc6443a534b2cdd5072233989b415d7596573e743f3e5b386fb',
      __kind: 'Sol',
    },
    retryDuration: 10,
  },
} as const;

const legacyVaultArbitrum180 = {
  origin: {
    txId: {
      value: '0x9c617e12f6ddd5c7cff2236b32970bc2bd168799c90f907269348e6ca8c7be18',
      __kind: 'Evm',
    },
    __kind: 'Vault',
    brokerId: undefined,
  },
  brokerFees: [],
  inputAsset: {
    __kind: 'ArbUsdc',
  },
  inputAmount: '500000000',
  outputAsset: {
    __kind: 'Usdt',
  },
  requestType: {
    __kind: 'Regular',
    outputAddress: {
      value: '0x16988558ad8ef084dbe0016c9ffdae908e480621',
      __kind: 'Eth',
    },
  },
  swapRequestId: '162',
} as const;

const depositChannel180 = {
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
  dcaParameters: {
    numberOfChunks: 10,
    chunkInterval: 2,
  },
  swapRequestId: '2',
} as const;

const depositChannel = {
  origin: {
    __kind: 'DepositChannel',
    channelId: '6',
    depositAddress: {
      value:
        '0x626372743170676a326e327071616b6c7a726466613377796d716d646e3235336d3368346c787366756d616a366136683767756d656474763573637665783266',
      __kind: 'Btc',
    },
    depositBlockHeight: '167',
  },
  inputAsset: { __kind: 'Btc' },
  inputAmount: '4999922',
  outputAsset: { __kind: 'Eth' },
  requestType: {
    __kind: 'Ccm',
    outputAddress: { value: '0xa51c1fc2f0d1a1b8494ed1fe312d7c3a78ed91c0', __kind: 'Eth' },
    ccmSwapMetadata: {
      swapAmounts: {
        principalSwapAmount: '4999922',
        gasBudget: '2',
      },
      depositMetadata: {
        sourceChain: { __kind: 'Bitcoin' },
        channelMetadata: {
          message:
            '0x0000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000003f7a400000000000000000000000000000000000000000000000000000000000000074761735465737400000000000000000000000000000000000000000000000000',
          gasBudget: '2',
          cfParameters:
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
} as const;

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

const vault = {
  origin: {
    __kind: 'Vault',
    txHash: '0x76628bde2b6d66c84104d3721456edde968b8bafb347f63fbb67816546131204',
  },
  inputAsset: { __kind: 'ArbEth' },
  inputAmount: '5000000000000000000',
  outputAsset: { __kind: 'Flip' },
  requestType: {
    __kind: 'Regular',
    outputAddress: { value: '0x720bb1f2f46ed499dc328cbe43c54a03d710cd03', __kind: 'Eth' },
  },
  swapRequestId: '62',
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

const ingressEgressFee = {
  origin: { __kind: 'Internal' },
  inputAsset: { __kind: 'ArbUsdc' },
  inputAmount: '450800',
  outputAsset: { __kind: 'ArbEth' },
  requestType: { __kind: 'IngressEgressFee' },
  swapRequestId: '8',
};

vi.mock('@chainflip/solana');

describe(swapRequested, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "SwapRequest", "SwapDepositChannel" CASCADE;`;
  });

  it('creates a new swap request (VAULT)', async () => {
    await swapRequested({ prisma, event: { ...event, args: vault }, block });

    const request = await prisma.swapRequest.findFirstOrThrow({ include: { beneficiaries: true } });

    expect(request).toMatchSnapshot({
      id: expect.any(BigInt),
    });
  });

  it('creates a new swap request (INGRESS_EGRESS_FEE)', async () => {
    await swapRequested({ prisma, event: { ...event, args: ingressEgressFee }, block });

    const request = await prisma.swapRequest.findFirstOrThrow();

    expect(request).toMatchSnapshot({
      id: expect.any(BigInt),
    });
  });

  it('creates a new swap request (DEPOSIT_CHANNEL)', async () => {
    const channel = await prisma.swapDepositChannel.create({
      data: {
        srcChain: assetConstants[depositChannel.inputAsset.__kind].chain,
        depositAddress: Buffer.from(
          depositChannel.origin.depositAddress.value.slice(2),
          'hex',
        ).toString(),
        issuedBlock: 1,
        channelId: BigInt(depositChannel.origin.channelId),
        isExpired: false,
        srcAsset: depositChannel.inputAsset.__kind,
        destAsset: depositChannel.outputAsset.__kind,
        destAddress: depositChannel.requestType.outputAddress.value,
        totalBrokerCommissionBps: 0,
        openingFeePaid: 0,
      },
    });

    await swapRequested({ prisma, event: { ...event, args: depositChannel }, block });

    const request = await prisma.swapRequest.findFirstOrThrow({ include: { beneficiaries: true } });

    expect(request.swapDepositChannelId).toBe(channel.id);
    expect(request).toMatchSnapshot({
      id: expect.any(BigInt),
      swapDepositChannelId: expect.any(BigInt),
    });
  });

  it('creates a new swap request (DEPOSIT_CHANNEL 180)', async () => {
    const channel = await prisma.swapDepositChannel.create({
      data: {
        srcChain: assetConstants[depositChannel180.inputAsset.__kind].chain,
        depositAddress: Buffer.from(
          depositChannel180.origin.depositAddress.value.slice(2),
          'hex',
        ).toString(),
        issuedBlock: 1,
        channelId: BigInt(depositChannel180.origin.channelId),
        isExpired: false,
        srcAsset: depositChannel180.inputAsset.__kind,
        destAsset: depositChannel180.outputAsset.__kind,
        destAddress: depositChannel180.requestType.outputAddress.value,
        totalBrokerCommissionBps: 0,
        openingFeePaid: 0,
      },
    });

    await swapRequested({ prisma, event: { ...event, args: depositChannel180 }, block });

    const request = await prisma.swapRequest.findFirstOrThrow();

    expect(request.swapDepositChannelId).toBe(channel.id);
    expect(request).toMatchSnapshot({
      id: expect.any(BigInt),
      swapDepositChannelId: expect.any(BigInt),
    });
  });

  it('creates a new swap request (VAULT 180)', async () => {
    await swapRequested({ prisma, event: { ...event, args: vaultBitcoin180 }, block });

    const request = await prisma.swapRequest.findFirstOrThrow({ include: { beneficiaries: true } });

    expect(request).toMatchSnapshot({
      id: expect.any(BigInt),
      beneficiaries: [
        { id: expect.any(BigInt), swapRequestId: expect.any(BigInt) },
        { id: expect.any(BigInt), swapRequestId: expect.any(BigInt) },
      ],
    });
  });

  it('creates a new swap request (LEGACY VAULT 180)', async () => {
    await swapRequested({ prisma, event: { ...event, args: legacyVaultArbitrum180 }, block });

    const request = await prisma.swapRequest.findFirstOrThrow({ include: { beneficiaries: true } });

    expect(request).toMatchSnapshot({
      id: expect.any(BigInt),
    });
  });

  it('creates a new swap request and gets the solana tx ref (VAULT 180)', async () => {
    vi.mocked(findSolanaDepositSignature).mockResolvedValue(
      '4tpsjS1WFhamaRBfYdEHdadHFs58Ppq8jrv26xwkquVjA5BfP7wGjBbwVrDCECDpxRgfCnqXfCK4way9BPutAyRS',
    );

    await swapRequested({ prisma, event: { ...event, args: vaultSolana180 }, block });

    const request = await prisma.swapRequest.findFirstOrThrow();

    expect(request).toMatchSnapshot({
      id: expect.any(BigInt),
    });
    expect(findSolanaDepositSignature).toBeCalledWith(
      'http://solana-rpc.test',
      null,
      'HZC6KyQYbxbKGiyWbBrwhxrPPecFi2yKG9jMwFqwNEtJ',
      1n,
      413006,
      413006,
    );
  });
});
