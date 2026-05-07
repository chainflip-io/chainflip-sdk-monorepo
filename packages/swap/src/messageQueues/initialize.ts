import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import env from '../config/env.js';
import { handleExit } from '../utils/function.js';
import baseLogger from '../utils/logger.js';

const logger = baseLogger.child({ module: 'message-queues' });

let redis: Redis | undefined;

const getRedis = () => {
  if (!redis && env.REDIS_URL) {
    redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
    handleExit(async () => {
      await redis?.quit();
    });
  }
  return redis;
};

const createQueue = ({ name }: { name: string }) => {
  const connection = getRedis();
  if (!connection) {
    throw new Error(`cannot create queue "${name}" without REDIS_URL`);
  }

  const queue = new Queue(name, {
    connection,
    defaultJobOptions: {
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    },
  });

  handleExit(async () => {
    await Promise.allSettled([queue.close()]);
  });

  logger.info(`Queue ${name} initialized.`);

  return queue;
};

export const queues: {
  quoteEvents: Queue | undefined;
} = {
  quoteEvents: undefined,
};

export const initializeQueues = () => {
  if (env.ENABLE_QUOTE_MESSAGE_QUEUE) {
    queues.quoteEvents = createQueue({ name: 'quote-events' });
  }
};
