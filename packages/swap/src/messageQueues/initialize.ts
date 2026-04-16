import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import env from '../config/env.js';
import { handleExit } from '../utils/function.js';
import baseLogger from '../utils/logger.js';

const logger = baseLogger.child({ module: 'message-queues' });

const redis = env.REDIS_URL ? new Redis(env.REDIS_URL, { maxRetriesPerRequest: null }) : undefined;

if (redis) {
  handleExit(async () => {
    await redis.quit();
  });
}

export const createQueue = ({ name }: { name: string }) => {
  if (!redis) {
    throw new Error(`cannot create queue "${name}" without REDIS_URL`);
  }

  const queue = new Queue(name, { connection: redis });

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
  if (env.ENABLE_QUOTE_MESSAGE_QUEUE && redis) {
    queues.quoteEvents = createQueue({ name: 'quote-events' });
  }
};
