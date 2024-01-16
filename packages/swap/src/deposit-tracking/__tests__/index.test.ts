import Redis from 'ioredis';
import { getPendingDeposit } from '..';
import prisma from '../../client';

jest.mock('../../config/env', () => ({
  REDIS_URL: 'redis://localhost:6379',
}));

describe(getPendingDeposit, () => {
  let redis: Redis;

  beforeAll(() => {
    redis = new Redis();
  });

  afterEach(async () => {
    await redis.flushall();
    await prisma.chainTracking.deleteMany();
  });

  afterAll(async () => {
    await redis.quit();
  });

  it('gets pending deposits from redis', async () => {
    await prisma.chainTracking.create({
      data: {
        chain: 'Ethereum',
        height: BigInt(1234567893),
      },
    });

    await redis.set(
      'deposit:Ethereum:0x1234',
      JSON.stringify([
        {
          amount: '0x9000',
          asset: { asset: 'FLIP', chain: 'Ethereum' },
          deposit_chain_block_height: 1234567890,
        },
      ]),
    );

    const deposit = await getPendingDeposit('Ethereum', 'FLIP', '0x1234');

    expect(deposit).toEqual({ amount: '36864', transactionConfirmations: 3 });
  });
});
