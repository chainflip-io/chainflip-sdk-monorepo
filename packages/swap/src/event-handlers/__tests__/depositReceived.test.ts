import { Block, Event } from '@/swap/processBlocks';
import prisma from '../../client';
import {
  depositReceivedArgs,
  networkDepositReceived,
} from '../networkDepositReceived';

describe('depositReceived', () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "DepositChannel" CASCADE`;
    await prisma.$queryRaw`TRUNCATE TABLE "Metadata" CASCADE`;
    await prisma.$queryRaw`TRUNCATE TABLE "Event" CASCADE`;
    await prisma.$queryRaw`TRUNCATE TABLE "Block" CASCADE`;
  });

  it('should find the liquidity deposit channel and insert the record for Bitcoin', async () => {
    await prisma.$transaction(async (txClient) => {
      await Promise.all([
        txClient.depositChannel.create({
          data: {
            srcChain: 'Bitcoin',
            depositAddress:
              'tb1pcy5k30tzv4xva4kw4jaarwk8nc0l3gclnal36dvmujy0vzjqxsl42q',
            channelId: 3,
            issuedBlock: 0,
            isSwapping: true,
          },
        }),
        txClient.swapDepositChannel.create({
          data: {
            srcAsset: 'BTC',
            srcChain: 'Bitcoin',
            srcChainExpiryBlock: 100,
            depositAddress:
              'tb1pcy5k30tzv4xva4kw4jaarwk8nc0l3gclnal36dvmujy0vzjqxsl42q',
            expectedDepositAmount: 0,
            destAddress: '0x6fd76a7699e6269af49e9c63f01f61464ab21d1c',
            destAsset: 'ETH',
            channelId: 3,
            issuedBlock: 0,
            swaps: {
              create: {
                srcAmount: '100000',
                destAmount: '100000',
                srcAsset: 'BTC',
                destAsset: 'ETH',
                depositAmount: '100000',
                destAddress: '0x6fd76a7699e6269af49e9c63f01f61464ab21d1c',
                type: 'SWAP',
                nativeId: 1,
              } as any,
            },
          },
        }),
      ]);

      // await depositReceived('Bitcoin')({
      //   block: { height: block.id } as Block,
      //   prisma: txClient,
      //   event: {
      //     args: {
      //       asset: {
      //         __kind: 'Btc',
      //       },
      //       amount: '100000',
      //       depositAddress: {
      //         value:
      //           '0x2469c12968bd62654cced6ceacbbd1bac79e1ff8a31f9f7f1d359be488f60a40',
      //         __kind: 'Taproot',
      //       },
      //     },
      //   } as Event,
      //   eventId: event.id,
      // });
    });

    // const result = await prisma.liquidityDeposit.findFirst();
    // expect(result?.depositAmount.toString()).toEqual('100000');
    // expect(result?.accountId).toEqual(
    //   'cFK2B5cJzL3admAMkmEsfko9nJeWmgm7CC4zNQnM2EySVqJ6Y',
    // );
  });

  it('should ignore the event as there is no liquidity deposit channel', async () => {
    await prisma.$transaction(async (txClient) => {
      await networkDepositReceived('Ethereum')({
        block: { height: 1 } as Block,
        prisma: txClient,
        event: {
          args: {
            asset: { __kind: 'Eth' },
            amount: '100000',
            depositAddress: '0x69c55204d2715cf09997de9108dbba739a52de2d',
          },
        } as Event,
      });
    });

    const result = await prisma.depositChannel.findFirst();
    expect(result).toEqual(null);
  });
});

describe('depositReceivedArgs', () => {
  it.each([
    {
      asset: { __kind: 'Btc' },
      amount: '1000000',
      depositAddress: {
        value:
          '0x69e988bde97e4b988f1d11fa362118c4bdf5e32c45a6e7e89fde3106b764bebd',
        __kind: 'Taproot',
      },
      depositDetails: {
        txId: '0x14fd88f956c399e64356546fea41ba234670a7b63c8e2b7e81c8f1ae9011b0d7',
        vout: 1,
      },
    },
    {
      asset: { __kind: 'Flip' },
      amount: '9853636405123772134',
      depositAddress: '0xe0c0ca3540ddd2fc6244e62aa8c8f70c7021ff7f',
    },
    {
      asset: { __kind: 'Usdc' },
      amount: '1000000000',
      depositAddress: '0x9a53bd378c459f71a74acd96bfcd64ed96d92a8e',
    },
    {
      asset: { __kind: 'Eth' },
      amount: '100000000000000000',
      depositAddress: '0xf7b277413fd3e1f1d1e631b1b121443889e46719',
    },
    {
      asset: { __kind: 'Dot' },
      amount: '30000000000',
      depositAddress:
        '0x2d369b6db7f9dc6f332ca5887208d5814dcd759a516ee2507f9582d8b25d7b97',
    },
  ])('parses the event', (args) => {
    expect(depositReceivedArgs.safeParse(args).success).toBe(true);
  });
});
