import { inspect } from 'util';
import processBlocks from './processBlocks.js';
import logger from './utils/logger.js';

// start
const start = () => {
  processBlocks().catch((error) => {
    logger.error('error processing blocks', { error: inspect(error) });
    process.exit(1);
  });
};

export default start;
