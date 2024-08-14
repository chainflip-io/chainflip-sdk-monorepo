import { networkDepositReceivedBtcMockV120 as networkDepositReceivedBtcMock } from '@/swap/event-handlers/__tests__/utils';
import prisma from '../../../client';
import {
  depositReceivedArgs as depositReceivedArgsV120,
  networkDepositReceived as networkDepositReceivedV120,
} from '../networkDepositReceived';

describe('depositReceivedV120', () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "private"."DepositChannel" CASCADE`;
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", "Swap" CASCADE`;
  });

  it('should update the values for an existing swap', async () => {
    await prisma.depositChannel.create({
      data: {
        srcChain: 'Bitcoin',
        depositAddress: 'tb1pdz3akc5wa2gr69v3x87tfg0ka597dxqvfl6zhqx4y202y63cgw0q3rgpm6',
        channelId: 3,
        issuedBlock: 0,
        isSwapping: true,
      },
    });

    const swapDepositChannel = await prisma.swapDepositChannel.create({
      data: {
        srcAsset: 'Btc',
        srcChain: 'Bitcoin',
        srcChainExpiryBlock: 100,
        depositAddress: 'tb1pdz3akc5wa2gr69v3x87tfg0ka597dxqvfl6zhqx4y202y63cgw0q3rgpm6',
        expectedDepositAmount: 0,
        destAddress: '0x6fd76a7699e6269af49e9c63f01f61464ab21d1c',
        brokerCommissionBps: 0,
        destAsset: 'Eth',
        channelId: 3,
        issuedBlock: 0,
        openingFeePaid: 0,
        swaps: {
          create: {
            swapInputAmount: '100000',
            depositAmount: '100000',
            srcAsset: 'Btc',
            destAsset: 'Eth',
            destAddress: '0x6fd76a7699e6269af49e9c63f01f61464ab21d1c',
            type: 'SWAP',
            nativeId: 1,
            depositReceivedAt: new Date(1670337099000),
            depositReceivedBlockIndex: `0-15`,
            swapScheduledAt: new Date(1670337099000),
            swapScheduledBlockIndex: `0-15`,
          } as any,
        },
      },
    });

    await prisma.$transaction(async (txClient) => {
      await networkDepositReceivedV120({
        prisma: txClient,
        block: networkDepositReceivedBtcMock().block as any,
        event: networkDepositReceivedBtcMock().eventContext.event as any,
      });
    });

    const swap = await prisma.swap.findFirstOrThrow({
      where: { swapDepositChannelId: swapDepositChannel.id },
      include: { fees: true },
    });

    expect(swap.depositAmount.toString()).toBe('110000');
    expect(swap).toMatchSnapshot({
      id: expect.any(BigInt),
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
      swapDepositChannelId: expect.any(BigInt),
      fees: [{ id: expect.any(BigInt), swapId: expect.any(BigInt) }],
    });
  });

  it('should store the transaction ref for a bitcoin swap', async () => {
    await prisma.depositChannel.create({
      data: {
        srcChain: 'Bitcoin',
        depositAddress: 'tb1pdz3akc5wa2gr69v3x87tfg0ka597dxqvfl6zhqx4y202y63cgw0q3rgpm6',
        channelId: 3,
        issuedBlock: 0,
        isSwapping: true,
      },
    });

    const swapDepositChannel = await prisma.swapDepositChannel.create({
      data: {
        srcAsset: 'Btc',
        srcChain: 'Bitcoin',
        srcChainExpiryBlock: 100,
        depositAddress: 'tb1pdz3akc5wa2gr69v3x87tfg0ka597dxqvfl6zhqx4y202y63cgw0q3rgpm6',
        expectedDepositAmount: 0,
        destAddress: '0x6fd76a7699e6269af49e9c63f01f61464ab21d1c',
        brokerCommissionBps: 0,
        destAsset: 'Eth',
        channelId: 3,
        issuedBlock: 0,
        openingFeePaid: 0,
        swaps: {
          create: {
            swapInputAmount: '100000',
            depositAmount: '100000',
            srcAsset: 'Btc',
            destAsset: 'Eth',
            destAddress: '0x6fd76a7699e6269af49e9c63f01f61464ab21d1c',
            type: 'SWAP',
            nativeId: 1,
            depositReceivedAt: new Date(1670337099000),
            depositReceivedBlockIndex: `0-15`,
            swapScheduledAt: new Date(1670337099000),
            swapScheduledBlockIndex: `0-15`,
          } as any,
        },
      },
    });

    await prisma.$transaction(async (txClient) => {
      await networkDepositReceivedV120({
        prisma: txClient,
        block: {
          height: 120,
          timestamp: 1670337105000,
        } as any,
        event: {
          args: {
            asset: {
              __kind: 'Btc',
            },
            amount: '110000',
            depositAddress: {
              value: '0x68a3db628eea903d159131fcb4a1f6ed0be6980c4ff42b80d5229ea26a38439e',
              __kind: 'Taproot',
            },
            ingressFee: '1000',
            action: { __kind: 'Swap', swapId: '1' },
            depositDetails: {
              txId: '0x24a51322a8712af423116700969b2b85518342003e225fd1c4de27130d038087',
              vout: 0,
            },
          },
          name: 'BitcoinIngressEgress.DepositReceived',
          indexInBlock: 7,
        },
      });
    });

    const swap = await prisma.swap.findFirstOrThrow({
      where: { swapDepositChannelId: swapDepositChannel.id },
    });
    expect(swap.depositTransactionRef).toEqual(
      '8780030d1327dec4d15f223e00428351852b9b9600671123f42a71a82213a524',
    );
  });

  it('should store the transaction ref for a polkadot swap', async () => {
    await prisma.depositChannel.create({
      data: {
        srcChain: 'Polkadot',
        depositAddress: '13bvStqPaSnNDTk4PuZ51q6Shtz3bucaZABkJfxWjzsyLvAv',
        channelId: 3,
        issuedBlock: 0,
        isSwapping: true,
      },
    });

    const swapDepositChannel = await prisma.swapDepositChannel.create({
      data: {
        srcAsset: 'Dot',
        srcChain: 'Polkadot',
        srcChainExpiryBlock: 100,
        depositAddress: '13bvStqPaSnNDTk4PuZ51q6Shtz3bucaZABkJfxWjzsyLvAv',
        expectedDepositAmount: 0,
        destAddress: '0x6fd76a7699e6269af49e9c63f01f61464ab21d1c',
        brokerCommissionBps: 0,
        destAsset: 'Eth',
        channelId: 3,
        issuedBlock: 0,
        openingFeePaid: 0,
        swaps: {
          create: {
            swapInputAmount: '100000',
            depositAmount: '100000',
            srcAsset: 'Dot',
            destAsset: 'Eth',
            destAddress: '0x6fd76a7699e6269af49e9c63f01f61464ab21d1c',
            type: 'SWAP',
            nativeId: 1,
            depositReceivedAt: new Date(1670337099000),
            depositReceivedBlockIndex: `0-15`,
            swapScheduledAt: new Date(1670337099000),
            swapScheduledBlockIndex: `0-15`,
          } as any,
        },
      },
    });

    await prisma.$transaction(async (txClient) => {
      await networkDepositReceivedV120({
        prisma: txClient,
        block: {
          height: 120,
          timestamp: 1670337105000,
        } as any,
        event: {
          args: {
            asset: {
              __kind: 'Dot',
            },
            amount: '56979771050821',
            depositAddress: '0x731aba38284769a557ac8630a190af1c69a134af7054dc2db3f69abcd3bf8969',
            ingressFee: '1000',
            action: { __kind: 'Swap', swapId: '1' },
            depositDetails: 2,
            blockHeight: 230281,
          },
          name: 'PolkadotIngressEgress.DepositReceived',
          indexInBlock: 7,
        },
      });
    });

    const swap = await prisma.swap.findFirstOrThrow({
      where: { swapDepositChannelId: swapDepositChannel.id },
    });
    expect(swap.depositTransactionRef).toEqual('230281-2');
  });

  it('should store the transaction ref for a ethereum swap', async () => {
    await prisma.depositChannel.create({
      data: {
        srcChain: 'Ethereum',
        depositAddress: '0xe720e23f62efc931d465a9d16ca303d72ad6c0bc',
        channelId: 3,
        issuedBlock: 0,
        isSwapping: true,
      },
    });

    const swapDepositChannel = await prisma.swapDepositChannel.create({
      data: {
        srcAsset: 'Usdc',
        srcChain: 'Ethereum',
        srcChainExpiryBlock: 100,
        depositAddress: '0xe720e23f62efc931d465a9d16ca303d72ad6c0bc',
        expectedDepositAmount: 0,
        destAddress: '0x6fd76a7699e6269af49e9c63f01f61464ab21d1c',
        brokerCommissionBps: 0,
        destAsset: 'Eth',
        channelId: 3,
        issuedBlock: 0,
        openingFeePaid: 0,
        swaps: {
          create: {
            swapInputAmount: '100000',
            depositAmount: '100000',
            srcAsset: 'Usdc',
            destAsset: 'Eth',
            destAddress: '0x6fd76a7699e6269af49e9c63f01f61464ab21d1c',
            type: 'SWAP',
            nativeId: 1,
            depositReceivedAt: new Date(1670337099000),
            depositReceivedBlockIndex: `0-15`,
            swapScheduledAt: new Date(1670337099000),
            swapScheduledBlockIndex: `0-15`,
          } as any,
        },
      },
    });

    await prisma.$transaction(async (txClient) => {
      await networkDepositReceivedV120({
        prisma: txClient,
        block: {
          height: 120,
          timestamp: 1670337105000,
        } as any,
        event: {
          args: {
            asset: {
              __kind: 'Usdc',
            },
            amount: '25000000000000000000',
            depositAddress: '0x731aba38284769a557ac8630a190af1c69a134af7054dc2db3f69abcd3bf8969',
            ingressFee: '350000',
            action: { __kind: 'Swap', swapId: '1' },
            depositDetails: {
              txHashes: ['0xa2d5df86c6ec123283eb052c598a0f4b650367a81ad141b9ff3adb0286a86c17'],
            },
            blockHeight: '115311',
          },
          name: 'EthereumIngressEgress.DepositReceived',
          indexInBlock: 7,
        },
      });
    });

    const swap = await prisma.swap.findFirstOrThrow({
      where: { swapDepositChannelId: swapDepositChannel.id },
    });
    expect(swap.depositTransactionRef).toEqual(
      '0xa2d5df86c6ec123283eb052c598a0f4b650367a81ad141b9ff3adb0286a86c17',
    );
  });

  it('should update the values for an existing ccm principal swap', async () => {
    await prisma.depositChannel.create({
      data: {
        srcChain: 'Bitcoin',
        depositAddress: 'tb1pdz3akc5wa2gr69v3x87tfg0ka597dxqvfl6zhqx4y202y63cgw0q3rgpm6',
        channelId: 3,
        issuedBlock: 0,
        isSwapping: true,
      },
    });

    const swapDepositChannel = await prisma.swapDepositChannel.create({
      data: {
        srcAsset: 'Btc',
        srcChain: 'Bitcoin',
        srcChainExpiryBlock: 100,
        depositAddress: 'tb1pdz3akc5wa2gr69v3x87tfg0ka597dxqvfl6zhqx4y202y63cgw0q3rgpm6',
        expectedDepositAmount: 0,
        destAddress: '0x6fd76a7699e6269af49e9c63f01f61464ab21d1c',
        brokerCommissionBps: 0,
        destAsset: 'Eth',
        channelId: 3,
        issuedBlock: 0,
        openingFeePaid: 0,
        swaps: {
          create: {
            swapInputAmount: '100000',
            depositAmount: '100000',
            srcAsset: 'Btc',
            destAsset: 'Eth',
            destAddress: '0x6fd76a7699e6269af49e9c63f01f61464ab21d1c',
            type: 'PRINCIPAL',
            nativeId: 1,
            depositReceivedAt: new Date(1670337099000),
            depositReceivedBlockIndex: `0-15`,
            swapScheduledAt: new Date(1670337099000),
            swapScheduledBlockIndex: `0-15`,
          } as any,
        },
      },
    });

    await prisma.$transaction(async (txClient) => {
      await networkDepositReceivedV120({
        prisma: txClient,
        block: networkDepositReceivedBtcMock().block as any,
        event: networkDepositReceivedBtcMock({
          __kind: 'CcmTransfer',
          principalSwapId: '1',
        }).eventContext.event as any,
      });
    });

    const swap = await prisma.swap.findFirstOrThrow({
      where: { swapDepositChannelId: swapDepositChannel.id },
      include: { fees: true },
    });

    expect(swap.depositAmount.toString()).toBe('110000');
    expect(swap).toMatchSnapshot({
      id: expect.any(BigInt),
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
      swapDepositChannelId: expect.any(BigInt),
      fees: [{ id: expect.any(BigInt), swapId: expect.any(BigInt) }],
    });
  });

  it('should update the values for an existing ccm gas swap', async () => {
    await prisma.depositChannel.create({
      data: {
        srcChain: 'Bitcoin',
        depositAddress: 'tb1pdz3akc5wa2gr69v3x87tfg0ka597dxqvfl6zhqx4y202y63cgw0q3rgpm6',
        channelId: 3,
        issuedBlock: 0,
        isSwapping: true,
      },
    });

    const swapDepositChannel = await prisma.swapDepositChannel.create({
      data: {
        srcAsset: 'Btc',
        srcChain: 'Bitcoin',
        srcChainExpiryBlock: 100,
        depositAddress: 'tb1pdz3akc5wa2gr69v3x87tfg0ka597dxqvfl6zhqx4y202y63cgw0q3rgpm6',
        expectedDepositAmount: 0,
        destAddress: '0x6fd76a7699e6269af49e9c63f01f61464ab21d1c',
        brokerCommissionBps: 0,
        destAsset: 'Eth',
        channelId: 3,
        issuedBlock: 0,
        openingFeePaid: 0,
        swaps: {
          create: {
            swapInputAmount: '100000',
            depositAmount: '100000',
            srcAsset: 'Btc',
            destAsset: 'Eth',
            destAddress: '0x6fd76a7699e6269af49e9c63f01f61464ab21d1c',
            type: 'PRINCIPAL',
            nativeId: 1,
            depositReceivedAt: new Date(1670337099000),
            depositReceivedBlockIndex: `0-15`,
            swapScheduledAt: new Date(1670337099000),
            swapScheduledBlockIndex: `0-15`,
          } as any,
        },
      },
    });

    await prisma.$transaction(async (txClient) => {
      await networkDepositReceivedV120({
        prisma: txClient,
        block: networkDepositReceivedBtcMock().block as any,
        event: networkDepositReceivedBtcMock({
          __kind: 'CcmTransfer',
          gasSwapId: '1',
        }).eventContext.event as any,
      });
    });

    const swap = await prisma.swap.findFirstOrThrow({
      where: { swapDepositChannelId: swapDepositChannel.id },
      include: { fees: true },
    });

    expect(swap.depositAmount.toString()).toBe('110000');
    expect(swap).toMatchSnapshot({
      id: expect.any(BigInt),
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
      swapDepositChannelId: expect.any(BigInt),
      fees: [{ id: expect.any(BigInt), swapId: expect.any(BigInt) }],
    });
  });

  it('should add a transaction ref for a boosted swap', async () => {
    await prisma.depositChannel.create({
      data: {
        srcChain: 'Bitcoin',
        depositAddress: 'tb1pdz3akc5wa2gr69v3x87tfg0ka597dxqvfl6zhqx4y202y63cgw0q3rgpm6',
        channelId: 3,
        issuedBlock: 0,
        isSwapping: true,
      },
    });

    const swapDepositChannel = await prisma.swapDepositChannel.create({
      data: {
        srcAsset: 'Btc',
        srcChain: 'Bitcoin',
        srcChainExpiryBlock: 100,
        depositAddress: 'tb1pdz3akc5wa2gr69v3x87tfg0ka597dxqvfl6zhqx4y202y63cgw0q3rgpm6',
        expectedDepositAmount: 0,
        destAddress: '0x6fd76a7699e6269af49e9c63f01f61464ab21d1c',
        brokerCommissionBps: 0,
        destAsset: 'Eth',
        channelId: 3,
        issuedBlock: 0,
        openingFeePaid: 0,
        swaps: {
          create: {
            prewitnessedDepositId: '333',
            swapInputAmount: '100000',
            depositAmount: '100000',
            srcAsset: 'Btc',
            destAsset: 'Eth',
            destAddress: '0x6fd76a7699e6269af49e9c63f01f61464ab21d1c',
            type: 'SWAP',
            nativeId: 1,
            depositReceivedAt: new Date(1670337099000),
            depositReceivedBlockIndex: `0-15`,
            swapScheduledAt: new Date(1670337099000),
            swapScheduledBlockIndex: `0-15`,
          } as any,
        },
      },
    });

    await prisma.$transaction(async (txClient) => {
      await networkDepositReceivedV120({
        prisma: txClient,
        block: {
          height: 120,
          timestamp: 1670337105000,
        } as any,
        event: {
          args: {
            asset: {
              __kind: 'Btc',
            },
            amount: '110000',
            depositAddress: {
              value: '0x68a3db628eea903d159131fcb4a1f6ed0be6980c4ff42b80d5229ea26a38439e',
              __kind: 'Taproot',
            },
            ingressFee: '1000',
            action: { __kind: 'BoostersCredited', prewitnessedDepositId: '333' },
            depositDetails: {
              txId: '0x24a51322a8712af423116700969b2b85518342003e225fd1c4de27130d038087',
              vout: 0,
            },
          },
          name: 'BitcoinIngressEgress.DepositReceived',
          indexInBlock: 7,
        },
      });
    });

    const swap = await prisma.swap.findFirstOrThrow({
      where: { swapDepositChannelId: swapDepositChannel.id },
    });
    expect(swap.depositTransactionRef).toEqual(
      '8780030d1327dec4d15f223e00428351852b9b9600671123f42a71a82213a524',
    );
  });

  it('should throw if there is no swap for deposit channel', async () => {
    await prisma.depositChannel.create({
      data: {
        srcChain: 'Bitcoin',
        depositAddress: 'tb1pdz3akc5wa2gr69v3x87tfg0ka597dxqvfl6zhqx4y202y63cgw0q3rgpm6',
        channelId: 3,
        issuedBlock: 0,
        isSwapping: true,
      },
    });

    await prisma.swapDepositChannel.create({
      data: {
        srcAsset: 'Btc',
        srcChain: 'Bitcoin',
        srcChainExpiryBlock: 100,
        depositAddress: 'tb1pdz3akc5wa2gr69v3x87tfg0ka597dxqvfl6zhqx4y202y63cgw0q3rgpm6',
        expectedDepositAmount: 0,
        destAddress: '0x6fd76a7699e6269af49e9c63f01f61464ab21d1c',
        brokerCommissionBps: 0,
        destAsset: 'Eth',
        channelId: 3,
        issuedBlock: 0,
        openingFeePaid: 0,
      },
    });

    await expect(
      prisma.$transaction(async (txClient) => {
        await networkDepositReceivedV120({
          prisma: txClient,
          block: networkDepositReceivedBtcMock().block as any,
          event: networkDepositReceivedBtcMock().eventContext.event as any,
        });
      }),
    ).rejects.toThrow();
  });

  it('should throw if the swapId does not match an existing swap', async () => {
    await prisma.depositChannel.create({
      data: {
        srcChain: 'Bitcoin',
        depositAddress: 'tb1pdz3akc5wa2gr69v3x87tfg0ka597dxqvfl6zhqx4y202y63cgw0q3rgpm6',
        channelId: 3,
        issuedBlock: 0,
        isSwapping: true,
      },
    });

    await prisma.swapDepositChannel.create({
      data: {
        srcAsset: 'Btc',
        srcChain: 'Bitcoin',
        srcChainExpiryBlock: 100,
        depositAddress: 'tb1pdz3akc5wa2gr69v3x87tfg0ka597dxqvfl6zhqx4y202y63cgw0q3rgpm6',
        expectedDepositAmount: 0,
        destAddress: '0x6fd76a7699e6269af49e9c63f01f61464ab21d1c',
        brokerCommissionBps: 0,
        destAsset: 'Eth',
        channelId: 3,
        issuedBlock: 0,
        openingFeePaid: 0,
        swaps: {
          create: {
            swapInputAmount: '100000',
            depositAmount: '100000',
            srcAsset: 'Btc',
            destAsset: 'Eth',
            destAddress: '0x6fd76a7699e6269af49e9c63f01f61464ab21d1c',
            type: 'SWAP',
            nativeId: 100,
            depositReceivedAt: new Date(1670337099000),
            depositReceivedBlockIndex: `0-15`,
            swapScheduledAt: new Date(1670337099000),
            swapScheduledBlockIndex: `0-15`,
          } as any,
        },
      },
    });

    await expect(
      prisma.$transaction(async (txClient) => {
        await networkDepositReceivedV120({
          prisma: txClient,
          block: networkDepositReceivedBtcMock().block as any,
          event: networkDepositReceivedBtcMock().eventContext.event as any,
        });
      }),
    ).rejects.toThrow();
  });
});

describe('depositReceivedArgsV120V120', () => {
  it.each([
    {
      asset: { __kind: 'Btc' },
      amount: '1000000',
      depositAddress: {
        value: '0x69e988bde97e4b988f1d11fa362118c4bdf5e32c45a6e7e89fde3106b764bebd',
        __kind: 'Taproot',
      },
      depositDetails: {
        txId: '0x14fd88f956c399e64356546fea41ba234670a7b63c8e2b7e81c8f1ae9011b0d7',
        vout: 1,
      },
      action: {
        __kind: 'Swap',
        swapId: '1',
      },
      ingressFee: '1000',
    },
    {
      asset: { __kind: 'Flip' },
      amount: '9853636405123772134',
      depositAddress: '0xe0c0ca3540ddd2fc6244e62aa8c8f70c7021ff7f',
      action: {
        __kind: 'Swap',
        swapId: '1',
      },
      ingressFee: '1000',
    },
    {
      asset: { __kind: 'Usdc' },
      amount: '1000000000',
      depositAddress: '0x9a53bd378c459f71a74acd96bfcd64ed96d92a8e',
      action: {
        __kind: 'Swap',
        swapId: '1',
      },
      ingressFee: '1000',
    },
    {
      asset: { __kind: 'Eth' },
      amount: '100000000000000000',
      depositAddress: '0xf7b277413fd3e1f1d1e631b1b121443889e46719',
      action: {
        __kind: 'Swap',
        swapId: '1',
      },
      ingressFee: '1000',
    },
    {
      asset: { __kind: 'Dot' },
      amount: '30000000000',
      depositAddress: '0x2d369b6db7f9dc6f332ca5887208d5814dcd759a516ee2507f9582d8b25d7b97',
      action: {
        __kind: 'Swap',
        swapId: '1',
      },
      ingressFee: '1000',
    },
    {
      asset: { __kind: 'Eth' },
      amount: '100000000000000000',
      depositAddress: '0xf7b277413fd3e1f1d1e631b1b121443889e46719',
      action: {
        __kind: 'CcmTransfer',
        principalSwapId: '1',
      },
      ingressFee: '1000',
    },
    {
      asset: { __kind: 'Eth' },
      amount: '100000000000000000',
      depositAddress: '0xf7b277413fd3e1f1d1e631b1b121443889e46719',
      action: {
        __kind: 'CcmTransfer',
        gasSwapId: '1',
      },
      ingressFee: '1000',
    },
    {
      asset: { __kind: 'Eth' },
      amount: '100000000000000000',
      depositAddress: '0xf7b277413fd3e1f1d1e631b1b121443889e46719',
      action: {
        __kind: 'NoAction',
      },
      ingressFee: '1000',
    },
  ])('parses the event', (args) => {
    expect(depositReceivedArgsV120.safeParse(args).success).toBe(true);
  });
});
