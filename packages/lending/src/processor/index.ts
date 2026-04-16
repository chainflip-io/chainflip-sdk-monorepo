import assert from 'assert';
import { GraphQLClient } from 'graphql-request';
import { inspect } from 'util';
import prisma from '../client.js';
import { env } from '../env.js';
import { GetBatchQuery } from '../gql/generated/graphql.js';
import { GET_BATCH } from '../gql/query.js';
import { handleExit } from '../handleExit.js';
import { logger } from '../logger.js';
import { handlerMap, lendingEventNames } from './handlers/index.js';

export type Block = NonNullable<GetBatchQuery['blocks']>['nodes'][number];
export type Event = Block['events']['nodes'][number];

const client = new GraphQLClient(env.INGEST_GATEWAY_URL);

// eslint-disable-next-line no-promise-executor-return
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchBlocks = async (height: number): Promise<Block[]> => {
  const start = performance.now();
  for (let i = 0; i < 5; i += 1) {
    try {
      const batch = await client.request(GET_BATCH, {
        height,
        limit: env.PROCESSOR_BATCH_SIZE,
        lendingEvents: lendingEventNames,
      });

      const blocks = batch.blocks?.nodes;

      assert(blocks !== undefined, 'blocks is undefined');

      logger.info('blocks fetched', {
        height,
        duration: performance.now() - start,
        attempt: i,
        blocksFetched: blocks.length,
      });

      return blocks;
    } catch (error) {
      logger.error('failed to fetch batch', { error: inspect(error) });
      if (i === 4) throw error;
    }
  }

  throw new Error('failed to fetch batch');
};

export default async function processBlocks() {
  logger.info('processing blocks');

  let run = true;

  handleExit(() => {
    logger.info('stopping processing of blocks');
    run = false;
  });

  logger.info('getting latest state');
  let { lastProcessedBlock: lastBlock } = await prisma.processorState.upsert({
    where: { id: 1 },
    create: { id: 1, lastProcessedBlock: -1 },
    update: {},
  });
  logger.info(`resuming processing from block ${lastBlock}`);

  let nextBatch: Promise<Block[]> | undefined;

  while (run) {
    const blocks = await (nextBatch ?? fetchBlocks(lastBlock + 1));

    const start = performance.now();

    if (blocks.length === 0) {
      nextBatch = undefined;

      await sleep(5000);

      // eslint-disable-next-line no-continue
      continue;
    }

    nextBatch =
      blocks.length === env.PROCESSOR_BATCH_SIZE
        ? fetchBlocks(lastBlock + blocks.length + 1)
        : undefined;

    logger.info(`processing blocks from ${lastBlock + 1} to ${lastBlock + blocks.length}...`);

    for (const block of blocks) {
      const state = await prisma.processorState.findUniqueOrThrow({ where: { id: 1 } });

      assert(
        state.lastProcessedBlock === lastBlock,
        'state height is not equal to lastBlock maybe another process is running',
      );

      assert(lastBlock + 1 === block.height, 'block height is not monotonically increasing');

      await prisma.$transaction(
        async (txClient) => {
          for (const event of block.events.nodes) {
            const eventHandler = handlerMap.getHandler(event.name, block.specId);
            if (!eventHandler) {
              throw new Error(`unexpected event: "${event.name}" for specId: "${block.specId}"`);
            }
            try {
              await eventHandler({ prisma: txClient, event, block });
            } catch (error) {
              logger.error('processBlock error: Error handling event', {
                error: inspect(error),
                eventName: event.name,
                indexInBlock: event.indexInBlock,
                blockHeight: block.height,
                specId: block.specId,
              });
              throw error;
            }
          }
          const result = await txClient.processorState.updateMany({
            where: { id: 1, lastProcessedBlock: block.height - 1 },
            data: { lastProcessedBlock: block.height },
          });
          assert(result.count === 1, 'failed to update state, maybe another process is running');
        },
        { timeout: env.PROCESSOR_TRANSACTION_TIMEOUT },
      );
      lastBlock = block.height;
    }

    const end = performance.now();
    logger.info(
      `processed ${blocks.length} blocks in ${end - start} milliseconds, last block: ${lastBlock}`,
    );
  }
}
