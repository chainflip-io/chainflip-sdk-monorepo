import assert from 'assert';
import { GraphQLClient } from 'graphql-request';
import { performance } from 'perf_hooks';
import { setTimeout as sleep } from 'timers/promises';
import prisma from './client';
import { SwappingEventName, eventHandlers } from './event-handlers';
import { GET_BATCH } from './gql/query';
import { handleExit } from './utils/function';
import logger from './utils/logger';

const { INGEST_GATEWAY_URL } = process.env;

export default async function processBlocks() {
  assert(INGEST_GATEWAY_URL, 'INGEST_GATEWAY_URL is not defined');
  const client = new GraphQLClient(INGEST_GATEWAY_URL);

  logger.info('processing blocks');
  let run = true;

  handleExit(() => {
    logger.info('stopping processing of blocks');
    run = false;
  });

  const swapEvents = Object.keys(eventHandlers) as SwappingEventName[];

  logger.info('getting latest state');
  let { height: lastBlock } = await prisma.state.upsert({
    where: { id: 1 },
    create: { id: 1, height: 0 },
    update: {},
  });
  logger.info(`resuming processing from block ${lastBlock}`);

  while (run) {
    const start = performance.now();

    const batch = await client.request(GET_BATCH, {
      height: lastBlock + 1,
      limit: 50,
      swapEvents,
    });

    const blocks = batch.blocks?.nodes;

    assert(blocks !== undefined, 'blocks is undefined');

    if (blocks.length === 0) {
      await sleep(5000);
      // eslint-disable-next-line no-continue
      continue;
    }

    logger.info(
      `processing blocks from ${lastBlock + 1} to ${
        lastBlock + blocks.length
      }...`,
    );

    for (const { events, ...block } of blocks) {
      const state = await prisma.state.findUniqueOrThrow({ where: { id: 1 } });

      assert(
        state.height === lastBlock,
        'state height is not equal to lastBlock maybe another process is running',
      );

      assert(lastBlock < block.height, 'block height is not increasing');
      await prisma.$transaction(async (txClient) => {
        for (const event of events.nodes) {
          await eventHandlers[event.name as SwappingEventName]({
            block,
            event,
            prisma: txClient,
          });
        }
        const result = await prisma.state.updateMany({
          where: { id: 1, height: block.height - 1 },
          data: { height: block.height },
        });
        assert(
          result.count === 1,
          'failed to update state, maybe another process is running',
        );
      });
      lastBlock = block.height;
    }

    const end = performance.now();
    logger.info(
      `processed ${blocks.length} blocks in ${
        end - start
      } milliseconds, last block: ${lastBlock}`,
    );
  }
}
