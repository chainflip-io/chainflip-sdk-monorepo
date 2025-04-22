// eslint-disable-next-line import/no-extraneous-dependencies
import { PrismaClient } from '@prisma/swapping';

// eslint-disable-next-line import/no-extraneous-dependencies
export * from '@prisma/swapping';

const prisma = new PrismaClient();

export default prisma;
