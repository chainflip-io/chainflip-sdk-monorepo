// import { DOT_ADDRESS, swapAmountTooLowDotDepositChannelMock } from './utils';
// import prisma from '../../client';
// import egressAmountZero from '../egressAmountZero';

// describe(egressAmountZero, () => {
//   beforeEach(async () => {
//     await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", "Swap", "FailedSwap" CASCADE`;
//   });

//   afterEach(async () => {
//     jest.resetAllMocks();
//   });

//   it('handles egressAmountZero event', async () => {
//     prisma.swapDepositChannel.findFirstOrThrow = jest
//       .fn()
//       .mockResolvedValueOnce({
//         id: 'internal-deposit-channel-id',
//       });
//     prisma.failedSwap.create = jest.fn();

//     await egressAmountZero({
//       prisma,
//       block: swapAmountTooLowDotDepositChannelMock.block as any,
//       event: swapAmountTooLowDotDepositChannelMock.eventContext.event as any,
//     });

//     expect(prisma.swapDepositChannel.findFirstOrThrow).toHaveBeenCalledTimes(1);
//     expect(prisma.swapDepositChannel.findFirstOrThrow).toHaveBeenNthCalledWith(
//       1,
//       {
//         where: {
//           srcChain: 'Polkadot',
//           depositAddress: DOT_ADDRESS,
//           channelId: 2n,
//           isExpired: false,
//         },
//         orderBy: { issuedBlock: 'desc' },
//       },
//     );
//     expect(prisma.failedSwap.create).toHaveBeenCalledTimes(1);
//     expect(prisma.failedSwap.create).toHaveBeenNthCalledWith(1, {
//       data: {
//         destAddress: 'bcrt1pzjdpc799qa5f7m65hpr66880res5ac3lr6y2chc4jsa',
//         destChain: 'Bitcoin',
//         depositAmount: '12500000000',
//         srcChain: 'Polkadot',
//         swapDepositChannelId: 'internal-deposit-channel-id',
//         txHash: undefined,
//         type: 'FAILED',
//       },
//     });
//   });

//   // it('handles a new event from a btc deposit channel', async () => {
//   //   prisma.swapDepositChannel.findFirstOrThrow = jest
//   //     .fn()
//   //     .mockResolvedValueOnce({
//   //       id: 'internal-deposit-channel-id',
//   //     });
//   //   prisma.failedSwap.create = jest.fn();

//   //   await swapAmountTooLow({
//   //     prisma,
//   //     block: swapAmountTooLowBtcDepositChannelMock.block as any,
//   //     event: swapAmountTooLowBtcDepositChannelMock.eventContext.event as any,
//   //   });

//   //   expect(prisma.swapDepositChannel.findFirstOrThrow).toHaveBeenCalledTimes(1);
//   //   expect(prisma.swapDepositChannel.findFirstOrThrow).toHaveBeenNthCalledWith(
//   //     1,
//   //     {
//   //       where: {
//   //         srcChain: 'Bitcoin',
//   //         depositAddress: 'bcrt1pzjdpc799qa5f7m65hpr66880res5ac3lr6y2chc4jsa',
//   //         channelId: 2n,
//   //         isExpired: false,
//   //       },
//   //       orderBy: { issuedBlock: 'desc' },
//   //     },
//   //   );
//   //   expect(prisma.failedSwap.create).toHaveBeenCalledTimes(1);
//   //   expect(prisma.failedSwap.create).toHaveBeenNthCalledWith(1, {
//   //     data: {
//   //       destAddress: '0x41ad2bc63a2059f9b623533d87fe99887d794847',
//   //       destChain: 'Ethereum',
//   //       depositAmount: '12500000000',
//   //       srcChain: 'Bitcoin',
//   //       swapDepositChannelId: 'internal-deposit-channel-id',
//   //       txHash: undefined,
//   //       type: 'FAILED',
//   //     },
//   //   });
//   // });

//   // it('does not store a swap if the deposit channel is not found', async () => {
//   //   prisma.swapDepositChannel.findFirstOrThrow = jest
//   //     .fn()
//   //     .mockRejectedValueOnce({ message: 'Not found' });
//   //   prisma.failedSwap.create = jest.fn();

//   //   try {
//   //     await swapAmountTooLow({
//   //       prisma,
//   //       block: swapAmountTooLowBtcDepositChannelMock.block as any,
//   //       event: swapAmountTooLowBtcDepositChannelMock.eventContext.event as any,
//   //     });
//   //   } catch (err) {
//   //     expect(err).toEqual({ message: 'Not found' });
//   //   }

//   //   expect(prisma.swapDepositChannel.findFirstOrThrow).toHaveBeenCalledTimes(1);
//   //   expect(prisma.failedSwap.create).toHaveBeenCalledTimes(0);
//   // });
// });
