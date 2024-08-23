import { assetConstants } from '@/shared/enums';
import prisma from '../../client';
import swapRequested from '../swapRequested';

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
    ccmDepositMetadata: {
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

describe(swapRequested, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "SwapRequest", "SwapDepositChannel" CASCADE;`;
  });

  it('creates a new swap request (VAULT)', async () => {
    await swapRequested({ prisma, event: { ...event, args: vault }, block });

    const request = await prisma.swapRequest.findFirstOrThrow();

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
    await prisma.swapDepositChannel.create({
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
        brokerCommissionBps: 0,
        openingFeePaid: 0,
      },
    });

    await swapRequested({ prisma, event: { ...event, args: depositChannel }, block });

    const request = await prisma.swapRequest.findFirstOrThrow();

    expect(request).toMatchSnapshot({
      id: expect.any(BigInt),
    });
  });
});
