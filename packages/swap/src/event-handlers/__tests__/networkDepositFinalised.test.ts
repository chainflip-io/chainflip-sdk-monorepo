import { findSolanaDepositSignature } from '@chainflip/solana';
import env from '@/swap/config/env';
import { networkDepositFinalised } from '@/swap/event-handlers/networkDepositFinalised';
import { createDepositChannel } from './utils';
import prisma from '../../client';

jest.mock('@chainflip/solana');

describe(networkDepositFinalised, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", "Swap", "SwapRequest" CASCADE`;

    const btcSwapDepositChannel = await createDepositChannel({
      srcChain: 'Bitcoin',
      srcAsset: 'Btc',
      destAsset: 'Eth',
      depositAddress: 'bcrt1pzjdpc799qa5f7m65hpr66880res5ac3lr6y2chc4jsa',
      destAddress: '0x41ad2bc63a2059f9b623533d87fe99887d794847',
      isExpired: true,
    });

    await prisma.swapRequest.create({
      data: {
        nativeId: 57034,
        srcAsset: 'Btc',
        destAsset: 'Eth',
        destAddress: '0x41ad2bc63a2059f9b623533d87fe99887d794847',
        swapDepositChannelId: btcSwapDepositChannel.id,
        swapInputAmount: '100000000',
        originType: 'DEPOSIT_CHANNEL',
        requestType: 'REGULAR',
        swapRequestedAt: new Date('2024-08-06T00:00:00.000Z'),
      },
    });
  });

  it('updates swap request for regular deposit', async () => {
    await networkDepositFinalised({
      prisma,
      block: {
        height: 10,
        specId: 'test@150',
        timestamp: '2024-08-06T00:00:06.000Z',
        hash: '0x123',
      },
      event: {
        args: {
          asset: {
            __kind: 'Btc',
          },
          action: {
            __kind: 'Swap',
            swapRequestId: '57034',
          },
          amount: '1000000',
          channelId: '0',
          ingressFee: '4668',
          depositAddress: {
            value: '0xeafd844c99bda909de3087d9398ce50764f3f615d1b443fc89e315c3353ede8c',
            __kind: 'Taproot',
          },
          depositDetails: {
            txId: '0x2f5fb94313817636321d9091465215f6fd353c8ab7d19c8a07e10a9b5c892108',
            vout: 0,
          },
          blockHeight: '128',
        },
        indexInBlock: 7,
      } as any,
    });

    expect(await prisma.swapRequest.findFirstOrThrow({ include: { fees: true } })).toMatchSnapshot({
      id: expect.any(BigInt),
      swapDepositChannelId: expect.any(BigInt),
      fees: [{ id: expect.any(BigInt), swapRequestId: expect.any(BigInt) }],
    });
  });

  it('updates swap request for boosted deposit', async () => {
    await prisma.swapRequest.update({
      where: {
        nativeId: 57034,
      },
      data: {
        prewitnessedDepositId: 5265,
      },
    });

    await networkDepositFinalised({
      prisma,
      block: {
        height: 10,
        specId: 'test@150',
        timestamp: '2024-08-06T00:00:06.000Z',
        hash: '0x123',
      },
      event: {
        args: {
          asset: {
            __kind: 'Btc',
          },
          action: {
            __kind: 'BoostersCredited',
            prewitnessedDepositId: '5265',
          },
          amount: '1000000',
          channelId: '0',
          ingressFee: '4668',
          depositAddress: {
            value: '0xeafd844c99bda909de3087d9398ce50764f3f615d1b443fc89e315c3353ede8c',
            __kind: 'Taproot',
          },
          depositDetails: {
            txId: '0x2f5fb94313817636321d9091465215f6fd353c8ab7d19c8a07e10a9b5c892108',
            vout: 0,
          },
          blockHeight: '128',
        },
        indexInBlock: 7,
      } as any,
    });

    expect(await prisma.swapRequest.findFirstOrThrow()).toMatchSnapshot({
      id: expect.any(BigInt),
      swapDepositChannelId: expect.any(BigInt),
    });
  });

  it('tries to find tx ref for solana swap request', async () => {
    env.SOLANA_RPC_HTTP_URL = 'https://rpc.devnet.solana.chainflip.io:443';
    jest
      .mocked(findSolanaDepositSignature)
      .mockResolvedValue(
        '4tpsjS1WFhamaRBfYdEHdadHFs58Ppq8jrv26xwkquVjA5BfP7wGjBbwVrDCECDpxRgfCnqXfCK4way9BPutAyRS',
      );

    await networkDepositFinalised({
      prisma,
      block: {
        height: 10,
        specId: 'test@150',
        timestamp: '2024-08-06T00:00:06.000Z',
        hash: '0x123',
      },
      event: {
        args: {
          asset: {
            __kind: 'SolUsdc',
          },
          action: {
            __kind: 'Swap',
            swapRequestId: '57034',
          },
          amount: '15571565420',
          channelId: '5935',
          ingressFee: '1077',
          blockHeight: '306632110',
          depositAddress: '0xb1d36320e7c647e445370c09e707a5fcc88b590f50428c836cede0a8655c4a04',
        },
        indexInBlock: 7,
      } as any,
    });

    expect(await prisma.swapRequest.findFirstOrThrow()).toMatchSnapshot({
      id: expect.any(BigInt),
      swapDepositChannelId: expect.any(BigInt),
    });
    expect(findSolanaDepositSignature).toBeCalledWith(
      'https://rpc.devnet.solana.chainflip.io:443',
      '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
      'CyA7dxLnXRasmsybQsjbDGreEx8NaEjLhEpHUm9DaABM',
      15571565420n,
      0,
      306632160,
    );
  });
});
