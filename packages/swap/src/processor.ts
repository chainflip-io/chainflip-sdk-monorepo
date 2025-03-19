import { inspect } from 'util';
import processBlocks from './processBlocks';
import logger from './utils/logger';

// start
const start = () => {
  processBlocks().catch((error) => {
    logger.error('error processing blocks', { error: inspect(error) });
    process.exit(1);
  });
};

export default start;
