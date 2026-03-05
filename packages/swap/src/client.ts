import { PrismaPg } from '@prisma/adapter-pg';
// eslint-disable-next-line import/no-extraneous-dependencies
import { PrismaClient } from '@prisma/swapping';

// eslint-disable-next-line import/no-extraneous-dependencies
export * from '@prisma/swapping';

// eslint-disable-next-line n/no-process-env
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

const prisma = new PrismaClient({ adapter });

export default prisma;
