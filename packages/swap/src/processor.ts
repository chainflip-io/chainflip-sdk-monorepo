import processBlocks from './processBlocks.js';
import logger, { inspectError } from './utils/logger.js';

// start
const start = async () => {
  processBlocks().catch((error) => {
    logger.error('error processing blocks', { error: inspectError(error) });
    process.exit(1);
  });
};

export default start;
