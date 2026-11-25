import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/third-party';
import env from './env.js';

export * from '@prisma/third-party';

const adapter = new PrismaPg({ connectionString: env.THIRD_PARTY_DATABASE_URL });

const prisma = new PrismaClient({ adapter });

export default prisma;
