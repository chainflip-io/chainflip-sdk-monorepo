import { inspect } from 'util';
import backfillFallbacks from './backfillFallbacks.js';
import processBlocks from './processBlocks.js';
import logger from './utils/logger.js';

// start
const start = async () => {
  await backfillFallbacks().catch((error) => {
    logger.error('error backfilling fallbacks', { error: inspect(error) });
  });
  processBlocks().catch((error) => {
    logger.error('error processing blocks', { error: inspect(error) });
    process.exit(1);
  });
};

export default start;
