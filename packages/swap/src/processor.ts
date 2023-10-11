import preBlock from './preBlock';
import processBlocks from './processBlocks';
import logger from './utils/logger';

// start
const start = () => {
  processBlocks(preBlock).catch((error) => {
    logger.error('error processing blocks', { error });
    process.exit(1);
  });
};

export default start;
