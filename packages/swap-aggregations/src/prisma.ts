import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/swap-aggregations';
import env from './env.js';

export * from '@prisma/swap-aggregations';

const adapter = new PrismaPg({ connectionString: env.INTEGRATORS_DATABASE_URL });

const prisma = new PrismaClient({ adapter });

export default prisma;
