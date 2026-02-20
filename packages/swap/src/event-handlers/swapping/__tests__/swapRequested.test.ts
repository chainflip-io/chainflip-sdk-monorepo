import { swappingSwapRequested as schema11100 } from '@chainflip/processor/11100/swapping/swapRequested';
import * as base58 from '@chainflip/utils/base58';
import { bytesToHex } from '@chainflip/utils/bytes';
import { assetConstants } from '@chainflip/utils/chainflip';
import * as ss58 from '@chainflip/utils/ss58';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import prisma from '../../../client.js';
import { check } from '../../__tests__/utils.js';
import swapRequested, { SwapRequestedArgs } from '../swapRequested.js';

const accountId = 'cFNzKSS48cZ1xQmdub2ykc2LUc5UZS2YjLaZBUvmxoXHjMMVh';

const vaultBitcoin11000 = {
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
  priceLimitsAndExpiry: {
    minPrice: '326183663919595400739649677085384465302843',
    expiryBehaviour: {
      __kind: 'RefundIfExpires',
      retryDuration: 150,
      refundAddress: {
        value: {
          value: {
            value: '0x6d76426367686f7345506973675338336963696e6a48696735346250635058457761',
            __kind: 'Taproot',
          },
          __kind: 'Btc',
        },
        __kind: 'ExternalAddress',
      },
    },
  },
} as const satisfies SwapRequestedArgs;

const vaultSolana11000 = {
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
  priceLimitsAndExpiry: {
    minPrice: '20330053335568424557569281615685057460598557419',
    expiryBehaviour: {
      __kind: 'RefundIfExpires',
      retryDuration: 10,
      refundAddress: {
        __kind: 'ExternalAddress',
        value: {
          value: '0xf79d5e026f12edc6443a534b2cdd5072233989b415d7596573e743f3e5b386fb',
          __kind: 'Sol',
        },
      },
    },
  },
} as const satisfies SwapRequestedArgs;

const depositChannel11000 = {
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
  outputAsset: { __kind: 'Sol' },
  requestType: {
    __kind: 'Regular',
    outputAction: {
      __kind: 'Egress',
      outputAddress: { value: '0xa51c1fc2f0d1a1b8494ed1fe312d7c3a78ed91c0', __kind: 'Sol' },
      ccmDepositMetadata: {
        sourceChain: { __kind: 'Bitcoin' },
        channelMetadata: {
          message:
            '0x0000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000003f7a400000000000000000000000000000000000000000000000000000000000000074761735465737400000000000000000000000000000000000000000000000000',
          gasBudget: '2',
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
  dcaParameters: {
    numberOfChunks: 10,
    chunkInterval: 2,
  },
  swapRequestId: '2',
} as const satisfies SwapRequestedArgs;

const depositChannel11100 = {
  origin: {
    __kind: 'DepositChannel',
    brokerId: '0x9059e6d854b769a505d01148af212bf8cb7f8469a7153edce8dcaedd9d299125',
    channelId: '6',
    depositAddress: { value: '0xe720e23f62efc931d465a9d16ca303d72ad6c0bc', __kind: 'Eth' },
    depositBlockHeight: '8298',
  },
  brokerFees: [
    { bps: 0, account: '0x9059e6d854b769a505d01148af212bf8cb7f8469a7153edce8dcaedd9d299125' },
  ],
  inputAsset: { __kind: 'Flip' },
  inputAmount: '99999999999943986559',
  outputAsset: { __kind: 'Usdc' },
  requestType: {
    __kind: 'Regular',
    outputAction: {
      __kind: 'Egress',
      outputAddress: { value: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266', __kind: 'Eth' },
    },
  },
  swapRequestId: '16',
  priceLimitsAndExpiry: {
    minPrice: '3365362323717425440129526627',
    maxOraclePriceSlippage: 100,
    expiryBehaviour: {
      __kind: 'RefundIfExpires',
      refundAddress: {
        value: { value: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266', __kind: 'Eth' },
        __kind: 'ExternalAddress',
      },
      retryDuration: 10,
    },
  },
} as const satisfies SwapRequestedArgs;

const solDepositChannel11000 = {
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
  outputAsset: { __kind: 'HubDot' },
  requestType: {
    __kind: 'Regular',
    outputAction: {
      __kind: 'Egress',
      outputAddress: {
        value: '0x02581a69b66b34f0d684f2249f7f45a4ef2c9d2f61c4fb82ed95c37e07850675',
        __kind: 'Hub',
      },
    },
  },
  swapRequestId: '92',
} as const satisfies SwapRequestedArgs;

const onChain11000 = {
  origin: {
    __kind: 'OnChainAccount',
    value: bytesToHex(ss58.decode(accountId).data),
  },
  brokerFees: [
    { bps: 100, account: '0x9059e6d854b769a505d01148af212bf8cb7f8469a7153edce8dcaedd9d299125' },
  ],
  inputAsset: { __kind: 'Sol' },
  inputAmount: '99999994999',
  outputAsset: { __kind: 'HubDot' },
  requestType: {
    __kind: 'Regular',
    outputAction: {
      __kind: 'CreditOnChain',
      accountId: bytesToHex(ss58.decode(accountId).data),
    },
  },
  swapRequestId: '92',
  priceLimitsAndExpiry: {
    minPrice: '99999994999',
    expiryBehaviour: {
      __kind: 'RefundIfExpires',
      retryDuration: 100,
      refundAddress: {
        __kind: 'InternalAccount',
        value: bytesToHex(ss58.decode(accountId).data),
      },
    },
  },
  dcaParameters: {
    numberOfChunks: 10,
    chunkInterval: 2,
  },
} as const satisfies SwapRequestedArgs;

const liquidation200 = {
  origin: { __kind: 'Internal' },
  brokerFees: [],
  inputAsset: { __kind: 'Eth' },
  inputAmount: '10000000000000000000',
  outputAsset: { __kind: 'Usdc' },
  requestType: {
    __kind: 'Regular',
    outputAction: {
      __kind: 'CreditLendingPool',
      swapType: {
        __kind: 'Liquidation',
        loanId: '6',
        borrowerId: '0x000000000000000000000000bbaf2530c7b24e83cce554b39cbf59b15febcb40',
      },
    },
  },
  dcaParameters: { chunkInterval: 1, numberOfChunks: 1 },
  swapRequestId: '30',
  priceLimitsAndExpiry: {
    minPrice: '0',
    expiryBehaviour: { __kind: 'NoExpiry' },
    maxOraclePriceSlippage: 500,
  },
} as const satisfies SwapRequestedArgs;

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
  name: 'Swapping.SwapRequested',
  pos: 19,
};

vi.mock('@chainflip/solana');

describe(swapRequested, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "SwapRequest", "SwapDepositChannel", private."SolanaPendingTxRef" CASCADE;`;
  });

  it('creates a new swap request (DEPOSIT_CHANNEL 11000)', async () => {
    const channel = await prisma.swapDepositChannel.create({
      data: {
        srcChain: assetConstants[depositChannel11000.inputAsset.__kind].chain,
        depositAddress: Buffer.from(
          depositChannel11000.origin.depositAddress.value.slice(2),
          'hex',
        ).toString(),
        issuedBlock: 1,
        channelId: BigInt(depositChannel11000.origin.channelId),
        isExpired: false,
        srcAsset: depositChannel11000.inputAsset.__kind,
        destAsset: depositChannel11000.outputAsset.__kind,
        destAddress: depositChannel11000.requestType.outputAction.outputAddress.value,
        totalBrokerCommissionBps: 0,
        openingFeePaid: 0,
      },
    });

    await swapRequested({ prisma, event: { ...event, args: depositChannel11000 }, block });

    const request = await prisma.swapRequest.findFirstOrThrow();

    expect(request.swapDepositChannelId).toBe(channel.id);
    expect(request).toMatchSnapshot({
      id: expect.any(BigInt),
      swapDepositChannelId: expect.any(BigInt),
    });
  });

  it('creates a new swap request (VAULT 11000)', async () => {
    await swapRequested({ prisma, event: { ...event, args: vaultBitcoin11000 }, block });

    const request = await prisma.swapRequest.findFirstOrThrow({ include: { beneficiaries: true } });

    expect(request).toMatchSnapshot({
      id: expect.any(BigInt),
      beneficiaries: [
        { id: expect.any(BigInt), swapRequestId: expect.any(BigInt) },
        { id: expect.any(BigInt), swapRequestId: expect.any(BigInt) },
      ],
    });
  });

  it('creates a new swap request (ON_CHAIN 11000)', async () => {
    await swapRequested({ prisma, event: { ...event, args: onChain11000 }, block });

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
    await swapRequested({ prisma, event: { ...event, args: vaultSolana11000 }, block });

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
        srcChain: assetConstants[solDepositChannel11000.inputAsset.__kind].chain,
        depositAddress: base58.encode(solDepositChannel11000.origin.depositAddress.value),
        issuedBlock: 1,
        channelId: BigInt(solDepositChannel11000.origin.channelId),
        isExpired: false,
        srcAsset: solDepositChannel11000.inputAsset.__kind,
        destAsset: solDepositChannel11000.outputAsset.__kind,
        destAddress: solDepositChannel11000.requestType.outputAction.outputAddress.value,
        totalBrokerCommissionBps: 0,
        openingFeePaid: 0,
      },
    });

    await swapRequested({ prisma, event: { ...event, args: solDepositChannel11000 }, block });

    const solanaPendingTxRef = await prisma.solanaPendingTxRef.findFirstOrThrow({
      where: { swapDepositChannelId: channel.id },
    });
    expect(solanaPendingTxRef).toMatchSnapshot({
      id: expect.any(Number),
      swapDepositChannelId: expect.any(BigInt),
    });
  });

  it('parses 1.11 event correctly', async () => {
    const swapRequestedEvent = check<SwapRequestedArgs>(depositChannel11100);
    expect(schema11100.safeParse(swapRequestedEvent)).toBeTruthy();
  });

  it('handles 1.11 (maxOraclePriceSlippage)', async () => {
    const channel = await prisma.swapDepositChannel.create({
      data: {
        srcChain: assetConstants[depositChannel11100.inputAsset.__kind].chain,
        depositAddress: depositChannel11100.origin.depositAddress.value,
        issuedBlock: 1,
        channelId: BigInt(depositChannel11100.origin.channelId),
        isExpired: false,
        srcAsset: depositChannel11100.inputAsset.__kind,
        destAsset: depositChannel11100.outputAsset.__kind,
        destAddress: depositChannel11100.requestType.outputAction.outputAddress.value,
        totalBrokerCommissionBps: 0,
        openingFeePaid: 0,
      },
    });

    await swapRequested({ prisma, event: { ...event, args: depositChannel11100 }, block });

    const request = await prisma.swapRequest.findFirstOrThrow();

    expect(request.swapDepositChannelId).toBe(channel.id);
    expect(request).toMatchSnapshot({
      id: expect.any(BigInt),
      swapDepositChannelId: expect.any(BigInt),
    });
    expect(request.fokMaxOraclePriceSlippageBps).toBe(
      depositChannel11100.priceLimitsAndExpiry.maxOraclePriceSlippage,
    );
  });

  it('creates a new swap request (LIQUIDATION 200)', async () => {
    await swapRequested({ prisma, event: { ...event, args: liquidation200 }, block });

    const request = await prisma.swapRequest.findFirstOrThrow({
      include: { liquidationSwapInfo: true },
    });

    expect(request).toMatchSnapshot({
      id: expect.any(BigInt),
      srcAddress: null, // not set for liquidation swaps
      destAddress: null,
      liquidationSwapInfo: {
        id: expect.any(Number),
        loanId: expect.any(BigInt),
        swapRequestId: expect.any(BigInt),
      },
    });
  });
});
